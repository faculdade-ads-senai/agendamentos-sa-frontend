import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { authenticate, clearSession, getCurrentUser, readSession } from './api.jsx'
import './style.css'
import Users from './users/Users.jsx'

const inputClass = 'w-full rounded-xl border border-ink/20 bg-white px-4 py-3.5 text-sm text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/25'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hash, setHash] = useState(window.location.hash)
  const generation = useRef(0)

  useEffect(() => {
    const changed = () => setHash(window.location.hash)
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])

  const onForbidden = useCallback(async () => {
    const version = generation.current
    try {
      const current = await getCurrentUser()
      if (version !== generation.current) return
      setUser(current)
      setError('Você não tem permissão para realizar esta operação.')
    } catch (problem) {
      if (version === generation.current) setError(problem.message)
    }
  }, [])

  const onSelfChange = useCallback(async () => {
    const version = generation.current
    const current = await getCurrentUser()
    if (version === generation.current) setUser(current)
  }, [])

  useEffect(() => {
    let active = true
    const version = generation.current
    if (!readSession()) {
      setChecking(false)
      return
    }
    getCurrentUser().then(current => { if (active && version === generation.current) setUser(current) })
      .catch(problem => { if (active && version === generation.current) setError(problem.message) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    function expired() {
      generation.current += 1
      clearSession()
      setUser(null)
      setError('Sua sessão expirou. Entre novamente.')
    }
    window.addEventListener('session-expired', expired)
    const session = user ? readSession() : null
    let timer
    if (user && !session) expired()
    else if (session) timer = window.setTimeout(expired, Math.max(0, session.expiresAt - Date.now()))
    return () => {
      window.removeEventListener('session-expired', expired)
      window.clearTimeout(timer)
    }
  }, [user])

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setError('')
    setBusy(true)
    try {
      await authenticate({ email: fields.get('email'), password: fields.get('password') })
      setUser(await getCurrentUser())
      setVisible(false)
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    generation.current += 1
    clearSession()
    setUser(null)
    setVisible(false)
    setError('')
    window.location.hash = ''
  }

  if (!checking && user) {
    const admin = user.perfil === 'ADMIN'
    const usersPage = hash.startsWith('#/usuarios')
    return <main className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-ink/15 bg-pine text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-8">
          <a href="#/" className="flex items-center gap-3 font-semibold"><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-mint text-2xl text-pine">+</span>Agenda Médica</a>
          <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-5 text-sm">
            <a href="#/" aria-current={!usersPage ? 'page' : undefined} className="hover:underline">Início</a>
            {admin && <a href="#/usuarios" aria-current={usersPage ? 'page' : undefined} className="font-semibold hover:underline">Usuários</a>}
            <span>{user.nome} · {user.perfil}</span>
            <button onClick={logout} className="rounded-xl border border-white/40 px-4 py-2 hover:bg-white/10">Sair</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {admin && usersPage ? <Users key={user.id} hash={hash} user={user} onForbidden={onForbidden} onSelfChange={onSelfChange} /> : <>
          {!admin && usersPage && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">A administração de usuários é exclusiva do perfil ADMIN.</p>}
          <h1 className="font-serif text-4xl md:text-5xl">Olá, {user.nome}</h1>
          <p className="mt-5 text-ink/75">Você está conectado à Agenda Médica.</p>
          {admin && <a href="#/usuarios" className="mt-8 inline-block rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-ink">Gerenciar usuários</a>}
        </>}
      </div>
    </main>
  }

  return (
    <main className="min-h-dvh bg-paper p-5 text-ink md:grid md:grid-cols-[0.95fr_1fr] md:gap-8 md:p-6">
      <aside className="agenda-pattern flex flex-col justify-between rounded-3xl bg-pine px-7 py-6 text-white md:min-h-[calc(100dvh-3rem)] md:p-12 xl:p-16">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-mint text-2xl text-pine">+</span>
          Agenda Médica
        </div>
        <div className="hidden md:block">
          <div aria-hidden="true" className="mb-9 grid max-w-64 grid-cols-7 gap-2">
            {Array.from({ length: 28 }, (_, index) => (
              <span key={index} className={`aspect-square rounded-md border border-white/20 ${[9, 10, 17, 24].includes(index) ? 'bg-mint' : 'bg-white/5'}`} />
            ))}
          </div>
          <p className="max-w-lg font-serif text-5xl leading-[1.05] tracking-tight xl:text-7xl">Sua agenda médica, em ordem.</p>
        </div>
        <p className="hidden border-t border-white/20 pt-5 text-sm text-mint md:block">Gestão de consultas</p>
      </aside>
      <section className="flex items-center justify-center px-2 py-12 md:px-8">
        <div className="w-full max-w-sm">
          {checking ? <p role="status">Verificando sua sessão…</p> : <>
            <h1 className="font-serif text-5xl tracking-tight">Bem-vindo</h1>
            <p className="mt-3 text-sm text-ink/75">Informe seu e-mail e sua senha.</p>
            <form onSubmit={submit} onChange={() => setError('')} className="mt-9 grid gap-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">E-mail</label>
                <input className={inputClass} id="email" name="email" type="email" autoComplete="username" maxLength={254} placeholder="nome@exemplo.com" required disabled={busy} />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">Senha</label>
                <div className="relative">
                  <input className={`${inputClass} pr-24`} id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" maxLength={72} required disabled={busy} />
                  <button type="button" className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-pine hover:underline" onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <button disabled={busy} className="mt-1 w-full rounded-xl bg-pine px-5 py-3.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-60">{busy ? 'Aguarde…' : 'Entrar'}</button>
            </form>
          </>}
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
