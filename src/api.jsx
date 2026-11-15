export async function createAccount({ name, email, password }) {
  const login = await fetch('/login', { cache: 'no-store' })
  const page = new DOMParser().parseFromString(await login.text(), 'text/html')
  const csrf = page.querySelector('form input[name="_csrf"]')?.value

  if (!login.ok || !csrf) {
    throw new Error('Não foi possível obter o token de segurança do Spring.')
  }

  const response = await fetch('/api/v1/usuarios', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrf,
    },
    body: JSON.stringify({
      nome: name.trim(),
      email: email.trim(),
      senha: password,
      perfil: 'PACIENTE',
    }),
  })

  if (response.status === 201) return
  if (response.redirected || response.status === 401 || response.status === 403) {
    throw new Error('O cadastro exige uma sessão autenticada no Spring Security.')
  }

  const problem = await response.json().catch(() => null)
  throw new Error(problem?.erros?.map(({ mensagem }) => mensagem).join(' ')
    || problem?.detail || 'Não foi possível criar a conta.')
}

export async function authenticate({ email, password }) {
  const route = import.meta.env.VITE_AUTH_PATH
  if (!route) throw new Error('A rota de autenticação ainda não foi configurada.')

  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: email.trim(), senha: password }),
  })
  if (!response.ok) throw new Error('Não foi possível validar as credenciais.')

  const valid = await response.json().catch(() => null)
  if (typeof valid !== 'boolean') throw new Error('A API retornou uma resposta inesperada.')
  return valid
}
