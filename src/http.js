export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// The transport is injectable so real cookie/CSRF behavior can be tested without Google.
export function createHttp({ baseUrl = '', transport = fetch, onUnauthorized = () => {} } = {}) {
  baseUrl = baseUrl.replace(/\/+$/, '')
  let csrfPromise
  const reset = () => { csrfPromise = undefined }

  async function request(path, { authenticated = true, ...options } = {}, retried = false) {
    const method = (options.method || 'GET').toUpperCase()
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    let body = options.body
    if (body != null) {
      headers.set('Content-Type', 'application/json')
      if (typeof body !== 'string') body = JSON.stringify(body)
    }
    if (unsafe) {
      csrfPromise ||= request('/api/v1/auth/csrf', { authenticated: false }).catch(error => {
        reset()
        throw error
      })
      const csrf = await csrfPromise
      if (!csrf?.headerName || !csrf?.token) {
        reset()
        throw new ApiError('Não foi possível preparar a operação segura. Tente novamente.', 0)
      }
      headers.set(csrf.headerName, csrf.token)
    }
    let response, raw
    try {
      response = await transport(`${baseUrl}${path}`, {
        ...options, method, body, headers, credentials: 'include', cache: 'no-store', redirect: 'error',
      })
      raw = response.status === 204 ? '' : await response.text()
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.', 0)
    }
    let result = null
    try { result = raw ? JSON.parse(raw) : null } catch { /* Never display server HTML. */ }
    if (!response.ok) {
      if (response.status === 403 && result?.code === 'csrf_invalid' && unsafe && !retried) {
        reset()
        return request(path, { ...options, authenticated }, true)
      }
      if (response.status === 401) {
        reset()
        if (authenticated) onUnauthorized()
      }
      const detail = response.status >= 500 ? '' : result?.erros?.map(item => item.mensagem).filter(Boolean).join(' ') || result?.detail
      throw new ApiError(detail || (response.status === 403 ? 'Você não tem permissão para esta operação.'
        : response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
          : 'Não foi possível concluir a operação.'), response.status, result?.code)
    }
    if (raw && result === null) throw new ApiError('O servidor retornou uma resposta inesperada.', 0)
    return result
  }
  return { request, reset }
}
