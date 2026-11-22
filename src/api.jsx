import { personalPayload } from './users/personal.js'
import { createHttp } from './http.js'
export { ApiError } from './http.js'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const mock = USE_MOCK ? await import('./mock.js') : null
const http = createHttp({ baseUrl, transport: USE_MOCK ? (url, options) => mock.mockRequest(url, options) : fetch,
  onUnauthorized: () => window.dispatchEvent(new Event('session-expired')) })
export const request = http.request
export function clearSession() { http.reset() }
export function startGoogleLogin() { window.location.assign(baseUrl + '/oauth2/authorization/google') }
export function getMockLoginUsers() { return mock ? mock.listMockLoginUsers() : [] }
export async function authenticateMockUser(id) { mock?.loginMockUser(id); http.reset() }
export async function logoutSession() {
  await request('/api/v1/auth/logout', { method: 'POST' })
  http.reset()
}
let currentRequest
export function getCurrentUser({ authenticated = true } = {}) {
  currentRequest ||= request('/api/v1/auth/me', { authenticated }).finally(() => { currentRequest = undefined })
  return currentRequest
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
  if (id == null || values.enviarDadosPessoais) body.dadosPessoais = personalPayload(values)
  return request(id == null ? '/api/v1/usuarios' : `/api/v1/usuarios/${id}`, {
    method: id == null ? 'POST' : 'PUT',
    body: JSON.stringify(body),
  })
}

export function deactivateUser(id) {
  return request(`/api/v1/usuarios/${id}`, { method: 'DELETE' })
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
export const updateProfile = ({ nome, telefone, endereco }) => request('/api/v1/usuarios/me', { method: 'PATCH', body: JSON.stringify({ nome, telefone, endereco }) })
export const getProfile = () => request('/api/v1/usuarios/me')
export const listNotifications = unread => listAll('/api/v1/notificacoes/me', { somenteNaoLidas: unread })
export const readNotification = id => request('/api/v1/notificacoes/' + id + '/leitura', { method: 'PATCH' })
export const cancelAppointment = (id, motivo) => request('/api/v1/agendamentos/' + id + '/cancelamento', { method: 'PATCH', body: JSON.stringify({ motivo }) })
export const rescheduleAppointment = (id, inicio, motivo) => request('/api/v1/agendamentos/' + id + '/reagendamento', { method: 'PATCH', body: JSON.stringify({ inicio, motivo }) })




export const createInvite = id => request(`/api/v1/usuarios/${id}/convites`, { method: 'POST' })

export const getPersonal = id => request(`/api/v1/usuarios/${id == null ? 'me' : id}/dados-pessoais`)
