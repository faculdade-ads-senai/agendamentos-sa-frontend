import seed from './mock.json'

export const doctors = structuredClone(seed.medicos)
const schedules = structuredClone(seed.agendas)
const blocks = structuredClone(seed.bloqueios)
const notifications = structuredClone(seed.notificacoes)

export function availableSlots(doctorId, day, appointments, excludeId) {
  if (!doctors.some(item => item.id === doctorId && item.ativo)) return []
  const weekday = new Date(day + 'T12:00:00-03:00').getUTCDay() || 7
  const windows = schedules.find(item => item.medicoId === doctorId)?.janelas || []
  const results = []
  for (const window of windows.filter(item => item.diaSemana === weekday)) {
    const end = new Date(day + 'T' + window.horaFim + '-03:00').getTime()
    const duration = window.duracaoMinutos * 60000
    for (let start = new Date(day + 'T' + window.horaInicio + '-03:00').getTime(); start + duration <= end; start += duration) {
      const finish = start + duration
      const occupied = appointments.some(item => item.id !== excludeId && item.medico.id === doctorId && item.status === 'AGENDADA' && new Date(item.inicio).getTime() < finish && new Date(item.fim).getTime() > start)
      const blocked = blocks.some(item => item.ativo && item.medicoId === doctorId && new Date(item.inicio).getTime() < finish && new Date(item.fim).getTime() > start)
      if (start > Date.now() && !occupied && !blocked) results.push({ inicio: new Date(start).toISOString(), fim: new Date(finish).toISOString() })
    }
  }
  return results
}

export function notify(appointment, actor, type, users) {
  const doctorUser = users.find(user => user.email === doctors.find(item => item.id === appointment.medico.id)?.email)
  for (const id of new Set([appointment.paciente.id, doctorUser?.id])) {
    if (!id || id === actor.id) continue
    const now = new Date().toISOString()
    notifications.push({ id: Math.max(0, ...notifications.map(item => item.id)) + 1, usuarioId: id, agendamentoId: appointment.id, tipo: type, canal: 'SISTEMA', status: 'ENVIADA', mensagem: type + ' · Consulta de ' + appointment.medico.especialidade + ' em ' + new Date(appointment.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + (appointment.motivoCancelamento ? ' · ' + appointment.motivoCancelamento : ''), criadaEm: now, enviadaEm: now, lidaEm: null })
  }
}

export function handleMockResources({ url, method, body, current, users, appointments, response, error, paginate }) {
  const path = url.pathname
  const admin = current.perfil === 'ADMIN'
  if (path === '/api/v1/usuarios/me') {
    if (method === 'GET') return response(current)
    if (method !== 'PATCH') return error('Método inválido.', 405)
    if ((body.nome !== undefined && (!body.nome.trim() || body.nome.length > 120)) || (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) return error('Nome ou e-mail inválido.', 400)
    if (body.email && users.some(item => item.id !== current.id && item.email === body.email.trim().toLowerCase())) return error('E-mail já cadastrado.', 409)
    if (body.nome) current.nome = body.nome.trim()
    if (body.email) {
      current.email = body.email.trim().toLowerCase()

    }
    current.atualizadoEm = new Date().toISOString()
    return response(current)
  }
  if (path === '/api/v1/notificacoes/me') return paginate(notifications.filter(item => item.usuarioId === current.id && (url.searchParams.get('somenteNaoLidas') !== 'true' || !item.lidaEm)).sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm)).map(({ usuarioId, ...item }) => item))
  const reading = /^\/api\/v1\/notificacoes\/(\d+)\/leitura$/.exec(path)
  if (reading) {
    const item = notifications.find(item => item.id === Number(reading[1]) && item.usuarioId === current.id)
    if (!item) return error('Notificação não encontrada.', 404)
    item.lidaEm ||= new Date().toISOString()
    return response(null, 204)
  }
  const change = /^\/api\/v1\/agendamentos\/(\d+)(?:\/(cancelamento|reagendamento))?$/.exec(path)
  if (change) {
    const item = appointments.find(item => item.id === Number(change[1]))
    const own = item && (current.perfil === 'PACIENTE' ? item.paciente.id === current.id : doctors.find(doctor => doctor.id === item.medico.id)?.email === current.email)
    if (!item || (!admin && !own) || (change[2] === 'reagendamento' && current.perfil === 'MEDICO')) return error('Consulta não encontrada.', 404)
    if (!change[2] && method === 'GET') return response(item)
    if (!change[2]) return error('Método inválido.', 405)
    if (method !== 'PATCH') return error('Método inválido.', 405)
    const remaining = new Date(item.inicio).getTime() - Date.now()
    if (item.status !== 'AGENDADA' || remaining <= 0 || (current.perfil === 'PACIENTE' && remaining < 86400000)) return error('Esta consulta não pode ser alterada. Entre em contato com a clínica.', 422)
    if (change[2] === 'cancelamento') {
      if (!body.motivo?.trim() || body.motivo.length > 255) return error('Informe um motivo de até 255 caracteres.', 400)
      item.status = 'CANCELADA'
      item.motivoCancelamento = body.motivo.trim()
      item.canceladoEm = new Date().toISOString()
    } else {
      const day = new Date(body.inicio).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      const slot = availableSlots(item.medico.id, day, appointments, item.id).find(slot => new Date(slot.inicio).getTime() === new Date(body.inicio).getTime())
      if (!slot) return error('Horário indisponível.', 409)
      Object.assign(item, slot)
    }
    item.atualizadoEm = new Date().toISOString()
    notify(item, current, change[2] === 'cancelamento' ? 'CANCELAMENTO' : 'ALTERACAO', users)
    return response(item)
  }
  if (path === '/api/v1/medicos') {
    if (method === 'GET') return paginate(doctors.filter(item => (!url.searchParams.has('ativo') || String(item.ativo) === url.searchParams.get('ativo')) && (!url.searchParams.has('especialidade') || item.especialidade === url.searchParams.get('especialidade'))))
    if (!admin) return error('Acesso exclusivo da administração.', 403)
  }
  const route = /^\/api\/v1\/medicos\/(\d+)(?:\/(agenda|bloqueios)(?:\/(\d+))?)?$/.exec(path)
  const doctor = route ? doctors.find(item => item.id === Number(route[1])) : null
  if (route && !doctor) return error('Médico não encontrado.', 404)
  if ((path === '/api/v1/medicos' && method === 'POST') || (route && !route[2] && method === 'PATCH')) {
    if (!admin) return error('Acesso exclusivo da administração.', 403)
    const values = { ...doctor, ...body }
    if (!values.nome?.trim() || values.nome.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || !values.crm?.trim() || values.crm.length > 20 || !/^[A-Z]{2}$/.test(values.ufCrm) || !values.especialidade?.trim() || values.especialidade.length > 100) return error('Confira os dados do médico.', 400)
    if (doctors.some(item => item.id !== doctor?.id && ((item.crm === values.crm && item.ufCrm === values.ufCrm) || item.email === values.email)) || users.some(item => item.email === values.email && item.email !== doctor?.email)) return error('E-mail ou CRM já cadastrado.', 409)
    const now = new Date().toISOString()
    if (doctor) Object.assign(doctor, body, { atualizadoEm: now })
    else {
      const created = { ...body, id: Math.max(0, ...doctors.map(item => item.id)) + 1, ativo: true, criadoEm: now, atualizadoEm: now }
      doctors.push(created)
      const userId = Math.max(0, ...users.map(item => item.id)) + 1
      users.push({ id: userId, nome: body.nome, email: body.email, perfil: 'MEDICO', ativo: true, criadoEm: now, atualizadoEm: now })
      return response(created, 201)
    }
    return response(doctor)
  }
  if (!route) return null
  if (!route[2]) return response(doctor)
  if (route[2] === 'agenda') {
    let schedule = schedules.find(item => item.medicoId === doctor.id)
    if (method === 'GET') return response(schedule || { medicoId: doctor.id, janelas: [] })
    if (!admin) return error('Acesso exclusivo da administração.', 403)
    if (!doctor.ativo) return error('Médico inativo.', 409)
    const windows = body.janelas
    const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
    if (!Array.isArray(windows) || windows.some(item => !Number.isInteger(item.diaSemana) || item.diaSemana < 1 || item.diaSemana > 7 || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(item.horaInicio) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(item.horaFim) || item.duracaoMinutos < 30 || item.duracaoMinutos > 60 || minutes(item.horaFim) - minutes(item.horaInicio) < item.duracaoMinutos || windows.some(other => other !== item && other.diaSemana === item.diaSemana && minutes(other.horaInicio) < minutes(item.horaFim) && minutes(other.horaFim) > minutes(item.horaInicio)))) return error('Janelas inválidas ou sobrepostas. Use duração de 30 a 60 minutos.', 422)
    if (!schedule) { schedule = { medicoId: doctor.id }; schedules.push(schedule) }
    schedule.janelas = structuredClone(windows)
    return response(schedule)
  }
  if (!admin) return error('Acesso exclusivo da administração.', 403)
  if (route[3]) {
    const block = blocks.find(item => item.id === Number(route[3]) && item.medicoId === doctor.id)
    if (!block) return error('Bloqueio não encontrado.', 404)
    block.ativo = false
    return response(null, 204)
  }
  if (method === 'GET') return response(blocks.filter(item => item.medicoId === doctor.id && item.ativo).sort((a, b) => new Date(a.inicio) - new Date(b.inicio)))
  if (!body.motivo?.trim() || body.motivo.length > 255) return error('Informe o motivo.', 400)
  if (!(new Date(body.inicio) < new Date(body.fim))) return error('O início deve ser anterior ao fim.', 422)
  if (!doctor.ativo || appointments.some(item => item.medico.id === doctor.id && item.status === 'AGENDADA' && new Date(item.inicio) < new Date(body.fim) && new Date(item.fim) > new Date(body.inicio))) return error('Existem consultas neste período ou o médico está inativo.', 409)
  const block = { ...body, id: Math.max(0, ...blocks.map(item => item.id)) + 1, medicoId: doctor.id, ativo: true }
  blocks.push(block)
  return response(block, 201)
}


