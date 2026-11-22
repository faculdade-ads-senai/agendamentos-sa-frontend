import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttp } from '../src/http.js'

const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

test('cookies, JSON, empty response and shared CSRF preparation', async () => {
  const calls = []
  const http = createHttp({ baseUrl: 'https://api.example/', transport: async (url, options) => {
    calls.push({ url, ...options })
    return url.endsWith('/csrf') ? json({ headerName: 'X-CSRF-TOKEN', token: 'secret' }) : new Response(null, { status: 204 })
  } })
  assert.deepEqual(await Promise.all([http.request('/a', { method: 'POST', body: { nome: 'Ana' } }), http.request('/b', { method: 'DELETE' })]), [null, null])
  assert.equal(calls.filter(c => c.url.endsWith('/csrf')).length, 1)
  for (const call of calls) {
    assert.equal(call.credentials, 'include')
    assert.equal(call.redirect, 'error')
    assert.equal(call.headers.has('Authorization'), false)
  }
  assert.equal(calls.find(c => c.url.endsWith('/a')).body, '{"nome":"Ana"}')
  assert.equal(calls.find(c => c.url.endsWith('/a')).headers.get('X-CSRF-TOKEN'), 'secret')
})

test('401 initial is anonymous, later 401 expires session; 403 does not', async () => {
  let expired = 0
  let status = 401
  const http = createHttp({ transport: async () => json({ detail: 'Acesso negado' }, status), onUnauthorized: () => expired++ })
  await assert.rejects(http.request('/me', { authenticated: false }), { status: 401 })
  assert.equal(expired, 0)
  await assert.rejects(http.request('/me'), { status: 401 })
  assert.equal(expired, 1)
  status = 403
  await assert.rejects(http.request('/users'), { status: 403 })
  assert.equal(expired, 1)
})

test('renews CSRF once only after explicit CSRF rejection', async () => {
  let tokens = 0, writes = 0
  const http = createHttp({ transport: async (url, options) => {
    if (url.endsWith('/csrf')) return json({ headerName: 'X-CSRF-TOKEN', token: String(++tokens) })
    writes++
    return writes === 1 ? json({ code: 'csrf_invalid' }, 403) : json({ ok: options.headers.get('X-CSRF-TOKEN') === '2' })
  } })
  assert.deepEqual(await http.request('/users', { method: 'PUT' }), { ok: true })
  assert.equal(writes, 2)
  assert.equal(tokens, 2)
})

test('never retries permission failure or network failure', async () => {
  for (const failure of [() => json({}, 403), () => { throw new TypeError('network') }]) {
    let writes = 0
    const http = createHttp({ transport: async url => {
      if (url.endsWith('/csrf')) return json({ headerName: 'X-CSRF-TOKEN', token: 'token' })
      writes++
      return failure()
    } })
    await assert.rejects(http.request('/users', { method: 'POST' }))
    assert.equal(writes, 1)
  }
})

test('caps CSRF retries, hides server errors and rejects unexpected HTML', async () => {
  let writes = 0
  const http = createHttp({ transport: async url => {
    if (url.endsWith('/csrf')) return json({ headerName: 'X-CSRF-TOKEN', token: 'token' })
    writes++
    return json({ code: 'csrf_invalid' }, 403)
  } })
  await assert.rejects(http.request('/users', { method: 'DELETE' }), { status: 403 })
  assert.equal(writes, 2)
  const server = createHttp({ transport: async () => json({ detail: 'private stack trace' }, 500) })
  await assert.rejects(server.request('/'), error => !error.message.includes('private'))
  const html = createHttp({ transport: async () => new Response('<html>login</html>') })
  await assert.rejects(html.request('/'), { status: 0 })
})
