import { validatePersonal, validateContacts } from './users/personal.js'
import { handleMockResources, availableSlots, notify, doctors } from './mockResources.js'
import seed from './mock.json'
import { validateUser } from './users/validation.js'

// Alterações ficam em memória e são restauradas ao recarregar a página.
const users = structuredClone(seed.users)
const appointments = structuredClone(seed.agendamentos)
let currentId = null
const personal = new Map()

function response(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function error(detail, status) {
  return response({ detail }, status)
}

export async function mockRequest(path, options) {
  const url = new URL(path, 'http://mock.local')
  const method = options.method || 'GET'
  const body = options.body ? JSON.parse(options.body) : {}
  if (url.pathname === '/api/v1/auth/csrf') return response({ headerName: 'X-CSRF-TOKEN', token: 'mock-csrf' })
  if (url.pathname === '/api/v1/auth/status') return response({ autenticado: currentId !== null })
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && options.headers.get('X-CSRF-TOKEN') !== 'mock-csrf') return response({ code: 'csrf_invalid' }, 403)
  if (url.pathname === '/api/v1/auth/logout' && method === 'POST') { currentId = null; return response(null, 204) }
  const current = users.find(item => item.id === currentId && item.ativo)
  if (!current) return error('Sua sessão expirou. Entre novamente.', 401)
  const personalRoute = /^\/api\/v1\/usuarios\/(me|[1-9]\d*)\/dados-pessoais$/.exec(url.pathname)
  if (personalRoute && method === 'GET') {
    if (personalRoute[1] !== 'me' && current.perfil !== 'ADMIN') return error('Acesso negado.', 403)
    const target = personalRoute[1] === 'me' ? current : users.find(item => item.id === Number(personalRoute[1]))
    if (!target) return error('Usuario nao encontrado.', 404)
    return response({ id: target.id, nome: target.nome, email: target.email, cpf: null, dataNascimento: null, telefone: null, endereco: null,
      ...personal.get(target.id), cadastroCompleto: Boolean(target.cadastroCompleto) })
  }
  if (url.pathname === '/api/v1/usuarios/me' && method === 'PATCH') {
    if (Object.keys(body).some(key => !['nome','telefone','endereco'].includes(key))) return error('Campo nao permitido.',400)
    if (!body.nome?.trim() || body.nome.trim().length > 120) return error('Nome invalido.',400)
    const contactError = validateContacts(body)
    if (contactError) return error(contactError,400)
    const previous = { ...personal.get(current.id) }
    for (const key of ['telefone','endereco']) if (Object.hasOwn(body,key)) previous[key] = body[key] || null
    personal.set(current.id,previous)
  }
  if (url.pathname === '/api/v1/auth/me') return response(current)
  if (url.pathname === '/mock/clinica') return response({ ...seed.clinica, medicos: doctors.filter(item => item.ativo) })
  function paginate(items) {
    const page = Number(url.searchParams.get('page') || 0)
    const size = Number(url.searchParams.get('size') || 20)
    return response({ content: items.slice(page * size, (page + 1) * size), page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) })
  }
  const resource = handleMockResources({ url, method, body, current, users, appointments, response, error, paginate })
  if (resource) return resource
  const available = /^\/api\/v1\/medicos\/(\d+)\/horarios-disponiveis$/.exec(url.pathname)
  const slots = (id, day) => availableSlots(id, day, appointments)
  if (available) return response(slots(Number(available[1]), url.searchParams.get('data')))
  if (url.pathname === '/api/v1/agendamentos' && method === 'POST') {
    if (!['PACIENTE', 'ADMIN'].includes(current.perfil)) return error('Sem permissão para agendar.', 403)
    const patient = current.perfil === 'ADMIN' ? users.find(item => item.id === body.pacienteId && item.perfil === 'PACIENTE' && item.ativo) : current
    if (!patient) return error('Selecione um paciente ativo.', 400)
    const doctor = doctors.find(item => item.id === body.medicoId && item.ativo)
    const day = new Date(body.inicio).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const slot = slots(body.medicoId, day).find(item => new Date(item.inicio).getTime() === new Date(body.inicio).getTime())
    if (!doctor || !slot) return error('Horário indisponível. Selecione outro horário.', 409)
    const now = new Date().toISOString()
    const appointment = { id: Math.max(0, ...appointments.map(item => item.id)) + 1,
      paciente: { id: patient.id, nome: patient.nome },
      medico: { id: doctor.id, nome: doctor.nome, especialidade: doctor.especialidade },
      ...slot, status: 'AGENDADA', criadoEm: now, atualizadoEm: now }
    appointments.push(appointment)
    notify(appointment, current, 'CONFIRMACAO', users)
    return response(appointment, 201)
  }
  if (url.pathname === '/api/v1/agendamentos/me') return paginate(appointments.filter(item => current.perfil === 'MEDICO' ? doctors.find(doctor => doctor.id === item.medico.id)?.email === current.email : item.paciente.id === current.id))
  if (url.pathname === '/api/v1/agendamentos' && method === 'GET') {
    if (current.perfil !== 'ADMIN') return error('Sem permissão.', 403)
    return paginate(appointments)
  }  if (current.perfil !== 'ADMIN') return error('Você não tem permissão para esta operação.', 403)

  const invite = /^\/api\/v1\/usuarios\/(\d+)\/convites$/.exec(url.pathname)
  if (invite && method === 'POST') {
    const target = users.find(item => item.id === Number(invite[1]))
    if (!target || !target.ativo || target.master || target.ativadoEm) return error('Convite indispon?vel para esta opera??o.', 409)
    return response({ id: 1, usuarioId: target.id, status: 'PENDENTE', expiraEm: new Date(Date.now() + 86400000).toISOString(), link: 'http://mock.local/convite/demonstracao' }, 201)
  }
  const match = /^\/api\/v1\/usuarios(?:\/([1-9]\d*))?$/.exec(url.pathname)
  if (!match) return error('Rota não encontrada.', 404)
  const id = match[1] ? Number(match[1]) : null
  const user = users.find(item => item.id === id)
  if (id !== null && !user) return error('Usuário não encontrado.', 404)
  if (method === 'GET' && id !== null) return response(user)
  if (method === 'GET') {
    const page = Number(url.searchParams.get('page') || 0)
    const size = Number(url.searchParams.get('size') || 20)
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) return error('Paginação inválida.', 400)
    return response({ ...seed.page, content: users.slice(page * size, (page + 1) * size), page, size, totalElements: users.length, totalPages: Math.ceil(users.length / size) })
  }
  if (method === 'DELETE' && user) {
    if (user.master) return error('Alteração protegida de cadastro.', 409)
    user.ativo = false
    user.atualizadoEm = new Date().toISOString()
    return response(null, 204)
  }
  if ((method === 'POST' && id === null) || (method === 'PUT' && user)) {
    if (user && ((user.master && (user.email !== body.email || user.perfil !== body.perfil || !body.ativo))
      || (user.id === current.id && user.perfil !== body.perfil)
      || (user.ativadoEm && user.email !== body.email))) return error('Alteração protegida de cadastro.', 409)
    const validation = validateUser({ ...body, ...body.dadosPessoais, enviarDadosPessoais: Boolean(body.dadosPessoais) }, method === 'PUT')
    if (validation) return error(validation, 400)
    if (users.some(item => item.id !== id && item.email.toLowerCase() === body.email.trim().toLowerCase())) return error('Já existe um usuário com este e-mail.', 409)
    if (body.dadosPessoais) {
      const invalid = validatePersonal(body.dadosPessoais)
      if (invalid) return error(invalid, 400)
      if ([...personal.entries()].some(([otherId, item]) => otherId !== id && item.cpf === body.dadosPessoais.cpf)) return error('CPF ja cadastrado.', 409)
    }
    const now = new Date().toISOString()
    const values = { ...(id === null ? { statusCadastro: 'PENDENTE', master: false, ativadoEm: null } : {}), nome: body.nome.trim(), email: body.email.trim().toLowerCase(), perfil: body.perfil, ativo: id === null ? true : body.ativo, atualizadoEm: now }
    let saved = user
    if (saved) Object.assign(saved, values)
    else {
      saved = { ...values, id: Math.max(0, ...users.map(item => item.id)) + 1, criadoEm: now }
      users.push(saved)
    }
    if (body.dadosPessoais) { personal.set(saved.id, structuredClone(body.dadosPessoais)); saved.cadastroCompleto = true }
    return response(saved, id === null ? 201 : 200)
  }
  return error('Operação não suportada.', 405)
}

export function listMockLoginUsers() {
  return users.filter(user => user.ativo).map(({ id, nome, perfil }) => ({ id, nome, perfil }))
}
export function loginMockUser(id) {
  const user = users.find(item => item.id === Number(id) && item.ativo)
  if (!user) throw new Error('Selecione um usuário disponível.')
  currentId = user.id
}
