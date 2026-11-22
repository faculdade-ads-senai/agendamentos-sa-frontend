import { test, expect } from '@playwright/test'

const admin = { id: 1, nome: 'Administrador', email: 'admin@example.com', perfil: 'ADMIN', ativo: true, master: true, ativadoEm: '2026-11-21T12:00:00Z' }
const pending = { id: 2, nome: 'Pessoa pendente', email: 'pessoa@example.com', perfil: 'PACIENTE', ativo: true, master: false, ativadoEm: null, statusCadastro: 'PENDENTE' }

async function api(page, initial = admin) {
  let current = initial
  let logoutFails = false
  const users = [admin, pending]
  const writes = []
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const path = url.pathname
    const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (path.endsWith('/csrf')) return send({ headerName: 'X-CSRF-TOKEN', token: 'browser-token' })
    if (method !== 'GET') {
      expect(req.headers()['x-csrf-token']).toBe('browser-token')
      expect(req.headers()['authorization']).toBeUndefined()
      writes.push({ path, method, body: req.postDataJSON() })
    }
    if (path.endsWith('/logout')) {
      if (logoutFails) return send({ detail: 'Falha temporária' }, 503)
      current = null
      return route.fulfill({ status: 204 })
    }
    if (!current) return send({ detail: 'Acesso negado' }, 401)
    if (path.endsWith('/dados-pessoais')) {
      const target = path.includes('/me/') ? current : pending
      return send({ id: target.id, nome: target.nome, email: target.email, cpf: null, dataNascimento: null, telefone: null, endereco: null, cadastroCompleto: false })
    }
    if (path.endsWith('/auth/me')) return send(current)
    if (path.endsWith('/convites')) return send({ link: 'http://localhost:8080/convite/example', expiraEm: '2026-12-01T12:00:00Z' }, 201)
    if (path === '/api/v1/usuarios' && method === 'GET') return send({ content: users, page: 0, size: 20, totalElements: 2, totalPages: 1 })
    if (path === '/api/v1/usuarios' && method === 'POST') return send({ ...pending, ...req.postDataJSON(), id: 3 }, 201)
    if (path === '/api/v1/usuarios/2' && method === 'GET') return send(pending)
    if (path === '/api/v1/usuarios/2' && method === 'PUT') return send({ ...pending, ...req.postDataJSON() })
    if (path === '/api/v1/usuarios/2' && method === 'DELETE') return route.fulfill({ status: 204 })
    return send({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  })
  return { writes, expire: () => { current = null }, failLogout: () => { logoutFails = true } }
}

test('anonymous login uses backend navigation and no password', async ({ page }) => {
  await api(page, null)
  await page.route('**/oauth2/authorization/google', route => route.fulfill({ contentType: 'text/html', body: 'Backend OAuth navigation' }))
  await page.goto('/#/usuarios')
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  await expect(page.locator('input[type=password]')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await expect(page).toHaveURL(/\/oauth2\/authorization\/google$/)
})

test('restores session on reload and confirms server logout', async ({ page }) => {
  const service = await api(page)
  await page.goto('/')
  await expect(page.getByText('Administrador · ADMIN')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Administrador · ADMIN')).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  expect(service.writes.some(w => w.path.endsWith('/logout'))).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
})

test('logout failure keeps authenticated UI and offers retry', async ({ page }) => {
  const service = await api(page)
  service.failLogout()
  await page.goto('/')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível encerrar')
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeEnabled()
})

test('patient cannot open administrative users and expired session leaves protected UI', async ({ page }) => {
  const service = await api(page, { ...admin, perfil: 'PACIENTE' })
  await page.goto('/#/usuarios')
  await expect(page.getByRole('alert')).toContainText('exclusiva')
  await expect(page.getByRole('link', { name: 'Criar usuário' })).toHaveCount(0)
  service.expire()
  await page.getByRole('link', { name: 'Meu cadastro' }).click()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
})

test('user CRUD and invitations send official password-free DTOs with CSRF', async ({ page }) => {
  const service = await api(page)
  page.on('dialog', dialog => dialog.accept())
  await page.goto('/#/usuarios')
  await page.getByRole('link', { name: 'Criar usuário', exact: true }).click()
  await page.getByLabel('Nome completo *', { exact: true }).fill('Ana')
  await page.getByLabel('E-mail *', { exact: true }).fill('ana@example.com')
  await page.getByLabel('Perfil *', { exact: true }).selectOption('PACIENTE')
  await page.getByLabel('CPF *', { exact: true }).fill('52998224725')
  await page.getByLabel('Data de nascimento *', { exact: true }).fill('1990-05-20')
  await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'criado com sucesso' })).toBeVisible()
  expect(service.writes.find(w => w.path === '/api/v1/usuarios').body).toEqual({ nome: 'Ana', email: 'ana@example.com', perfil: 'PACIENTE', dadosPessoais: { cpf: '52998224725', dataNascimento: '1990-05-20', telefone: null, endereco: null } })
  await page.getByRole('button', { name: 'Gerar convite' }).click()
  await expect(page.getByRole('dialog', { name: 'Convite gerado' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar convite' }).click()
  await page.getByRole('link', { name: 'Editar Pessoa pendente' }).click()
  await page.getByLabel('Nome completo *', { exact: true }).fill('Pessoa editada')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'atualizado com sucesso' })).toBeVisible()
  expect(service.writes.find(w => w.method === 'PUT').body).toEqual({ nome: 'Pessoa editada', email: pending.email, perfil: 'PACIENTE', ativo: true })
  await page.getByRole('button', { name: 'Inativar Pessoa pendente' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'inativado com sucesso' })).toBeVisible()
})

test('OAuth error is accessible and query parameter is consumed', async ({ page }) => {
  await api(page, null)
  await page.goto('/?auth_error=invite_invalid')
  await expect(page.getByRole('alert')).toContainText('Convite inválido ou expirado')
  await expect(page).not.toHaveURL(/auth_error/)
})

test('user pagination follows zero-based page, size and sort contract', async ({ page }) => {
  await api(page)
  const pages = []
  await page.route('**/api/v1/usuarios?*', async route => {
    const params = new URL(route.request().url()).searchParams
    pages.push(params.get('page'))
    expect(params.get('size')).toBe('20')
    expect(params.get('sort')).toBe('id,asc')
    const second = params.get('page') === '1'
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: [second ? pending : admin], page: second ? 1 : 0, size: 20, totalElements: 21, totalPages: 2 }) })
  })
  await page.goto('/#/usuarios')
  await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page.getByRole('cell', { name: 'Pessoa pendente', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  await page.getByRole('button', { name: 'Anterior' }).click()
  await expect(page.getByRole('link', { name: 'Editar Administrador' })).toBeVisible()
  expect(pages).toEqual(['0', '1', '0'])
})

for (const perfil of ['MEDICO', 'PACIENTE']) {
  test(`${perfil} edits only own name and contact`, async ({ page }) => {
    const service = await api(page, { ...admin, perfil })
    await page.goto('/#/cadastro')
    await expect(page.getByLabel('CPF', { exact: true })).toHaveJSProperty('readOnly', true)
    await expect(page.getByLabel('Data de nascimento', { exact: true })).toHaveJSProperty('readOnly', true)
    await page.getByLabel('Telefone (opcional, com código do país)').fill('+5548999999999')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Cadastro atualizado.' })).toBeVisible()
    const update = service.writes.find(w => w.path === '/api/v1/usuarios/me')
    expect(update.body).toEqual({ nome: admin.nome, telefone: '+5548999999999', endereco: null })
    expect(update.body).not.toHaveProperty('cpf')
    expect(update.body).not.toHaveProperty('dataNascimento')
  })
}

for (const perfil of ['ADMIN', 'MEDICO']) {
  test(`administrative creation requires personal data for ${perfil}`, async ({ page }) => {
    const service = await api(page)
    await page.goto('/#/usuarios/novo')
    await page.getByLabel('Nome completo *', { exact: true }).fill('Pessoa de teste')
    await page.getByLabel('E-mail *', { exact: true }).fill('pessoa@example.com')
    await page.getByLabel('Perfil *', { exact: true }).selectOption(perfil)
    await page.getByLabel('CPF *', { exact: true }).fill('11111111111')
    await page.getByLabel('Data de nascimento *', { exact: true }).fill('1990-05-20')
    await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('CPF válido')
    expect(service.writes).toHaveLength(0)
    await page.getByLabel('CPF *', { exact: true }).fill('52998224725')
    await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'criado com sucesso' })).toBeVisible()
    expect(service.writes[0].body.perfil).toBe(perfil)
    expect(service.writes[0].body.dadosPessoais.cpf).toBe('52998224725')
  })
}
