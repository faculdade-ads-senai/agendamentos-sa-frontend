import { mockRequest, listMockLoginUsers, mockLoginCredentials } from './mock.js'

// true usa mock.json. false usa a API real.
export const USE_MOCK = true

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const storageKey = USE_MOCK ? 'agenda-sa.mock-session' : 'agenda-sa.session'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function clearSession() {
  sessionStorage.removeItem(storageKey)
}

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(storageKey))
    if (typeof session?.accessToken === 'string' && Number.isFinite(session.expiresAt)
        && session.expiresAt > Date.now()) return session
  } catch {
    // Uma sessão corrompida precisa de um novo login.
  }
  clearSession()
  return null
}

export async function request(path, { authenticated = true, ...options } = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (authenticated) {
    const session = readSession()
    if (!session) {
      window.dispatchEvent(new Event('session-expired'))
      throw new ApiError('Sua sessão expirou. Entre novamente.', 401)
    }
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  let response
  try {
    response = USE_MOCK
      ? await mockRequest(path, { ...options, headers })
      : await fetch(`${baseUrl}${path}`, { ...options, headers, cache: 'no-store' })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.', 0)
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearSession()
      window.dispatchEvent(new Event('session-expired'))
    }
    throw new ApiError(body?.erros?.map(({ mensagem }) => mensagem).join(' ')
      || body?.detail || (response.status === 403 ? 'Você não tem permissão para esta operação.'
        : 'Não foi possível concluir a operação.'), response.status)
  }
  return body
}

export async function authenticate({ email, password }) {
  const session = await request('/api/v1/auth/login', {
    authenticated: false,
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), senha: password }),
  })
  if (typeof session?.accessToken !== 'string' || session.tokenType !== 'Bearer'
      || !Number.isFinite(session.expiresIn) || session.expiresIn <= 0) {
    throw new ApiError('A API retornou uma resposta de login inesperada.', 0)
  }
  sessionStorage.setItem(storageKey, JSON.stringify({
    accessToken: session.accessToken,
    expiresAt: Date.now() + session.expiresIn * 1000,
  }))
}

export function getCurrentUser() {
  return request('/api/v1/auth/me')
}

export function listUsers(page = 0) {
  return request(`/api/v1/usuarios?${new URLSearchParams({ page, size: 20, sort: 'id,asc' })}`)
}

export function getUser(id) {
  return request(`/api/v1/usuarios/${id}`)
}

export function saveUser(values, id) {
  const body = { nome: values.nome.trim(), email: values.email.trim(), perfil: values.perfil }
  if (id != null) body.ativo = values.ativo
  if (id == null || values.senha !== '') body.senha = values.senha
  return request(id == null ? '/api/v1/usuarios' : `/api/v1/usuarios/${id}`, {
    method: id == null ? 'POST' : 'PUT',
    body: JSON.stringify(body),
  })
}

export function deactivateUser(id) {
  return request(`/api/v1/usuarios/${id}`, { method: 'DELETE' })
}


export function getMockLoginUsers() {
  return USE_MOCK ? listMockLoginUsers() : []
}

export function authenticateMockUser(id) {
  const credentials = USE_MOCK ? mockLoginCredentials(id) : null
  if (!credentials) throw new ApiError('Selecione um usuário disponível.', 400)
  return authenticate(credentials)
}

function appointmentView(item) {
  return { ...item, paciente: item.paciente.nome, medico: item.medico.nome,
    medicoId: item.medico.id, pacienteId: item.paciente.id,
    especialidade: item.medico.especialidade, tipo: item.medico.especialidade }
}

export async function getAppointments() {
  const session = await getCurrentUser()
  const path = session.perfil === 'ADMIN' ? '/api/v1/agendamentos' : '/api/v1/agendamentos/me'
  let page = 0
  const items = []
  let result
  do {
    result = await request(path + '?' + new URLSearchParams({ page, size: 100 }))
    items.push(...result.content.map(appointmentView))
    page += 1
  } while (page < result.totalPages)
  return items
}

export async function getSpecialties() {
  let page = 0
  const doctors = []
  let result
  do {
    result = await request('/api/v1/medicos?' + new URLSearchParams({ page, size: 100 }))
    doctors.push(...result.content.filter(item => item.ativo))
    page += 1
  } while (page < result.totalPages)
  return doctors.map(item => ({ id: String(item.id), medicoId: item.id, nome: item.especialidade + ' · ' + item.nome }))
}

export async function getAvailableTimes(doctorId, day) {
  return request('/api/v1/medicos/' + doctorId + '/horarios-disponiveis?' + new URLSearchParams({ data: day }))
}

export function bookAppointment(values) {
  return request('/api/v1/agendamentos', {
    method: 'POST',
    body: JSON.stringify({ medicoId: Number(values.especialidade), inicio: values.inicio, ...(values.pacienteId ? { pacienteId: Number(values.pacienteId) } : {}) }),
  })
}
export async function getClinic() {
  if (USE_MOCK) return request('/mock/clinica')
  return { nome: 'Agenda Médica', medicos: (await listDoctors()).filter(item => item.ativo) }
}
export async function listAll(path, filters = {}) {
  const items = []
  let page = 0
  let result
  do {
    result = await request(path + '?' + new URLSearchParams({ ...filters, page, size: 100 }))
    items.push(...result.content)
    page += 1
  } while (page < result.totalPages)
  return items
}

export const listDoctors = () => listAll('/api/v1/medicos')
export const saveDoctor = (values, id) => request('/api/v1/medicos' + (id ? '/' + id : ''), { method: id ? 'PATCH' : 'POST', body: JSON.stringify(values) })
export const getDoctorSchedule = id => request('/api/v1/medicos/' + id + '/agenda')
export const saveDoctorSchedule = (id, janelas) => request('/api/v1/medicos/' + id + '/agenda', { method: 'PUT', body: JSON.stringify({ janelas }) })
export const listBlocks = id => request('/api/v1/medicos/' + id + '/bloqueios')
export const createBlock = (id, values) => request('/api/v1/medicos/' + id + '/bloqueios', { method: 'POST', body: JSON.stringify(values) })
export const removeBlock = (id, blockId) => request('/api/v1/medicos/' + id + '/bloqueios/' + blockId, { method: 'DELETE' })
export const updateProfile = values => request('/api/v1/usuarios/me', { method: 'PATCH', body: JSON.stringify(values) })
export const getProfile = () => request('/api/v1/usuarios/me')
export const listNotifications = unread => listAll('/api/v1/notificacoes/me', { somenteNaoLidas: unread })
export const readNotification = id => request('/api/v1/notificacoes/' + id + '/leitura', { method: 'PATCH' })
export const cancelAppointment = (id, motivo) => request('/api/v1/agendamentos/' + id + '/cancelamento', { method: 'PATCH', body: JSON.stringify({ motivo }) })
export const rescheduleAppointment = (id, inicio, motivo) => request('/api/v1/agendamentos/' + id + '/reagendamento', { method: 'PATCH', body: JSON.stringify({ inicio, motivo }) })



