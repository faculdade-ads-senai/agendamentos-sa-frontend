const accountsKey = 'agenda-medica.accounts'
const sessionKey = 'agenda-medica.session'

export function currentUser() {
  return sessionStorage.getItem(sessionKey)
}

export function signOut() {
  sessionStorage.removeItem(sessionKey)
}

export async function authenticate({ email, password, register }) {
  const address = email.trim().toLowerCase()
  const accounts = JSON.parse(localStorage.getItem(accountsKey) ?? '{}')
  const account = accounts[address]

  if (register && account) throw new Error('Já existe uma conta com este e-mail.')
  if (!register && !account) throw new Error('E-mail ou senha incorretos.')

  const salt = account?.salt ?? crypto.randomUUID()
  const bytes = new TextEncoder().encode(salt + password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(new Uint8Array(digest)).join(',')

  if (register) {
    accounts[address] = { salt, hash }
    localStorage.setItem(accountsKey, JSON.stringify(accounts))
  } else if (hash !== account.hash) {
    throw new Error('E-mail ou senha incorretos.')
  }

  sessionStorage.setItem(sessionKey, address)
  return address
}
