const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const storageKey = 'agenda-sa.session'

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
    response = await fetch(`${baseUrl}${path}`, { ...options, headers, cache: 'no-store' })
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
