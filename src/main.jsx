import SidePanel from './components/SidePanel.jsx'
import Doctors from './doctors/Doctors.jsx'
import Notifications from './account/Notifications.jsx'
import Profile from './account/Profile.jsx'
import PatientHome from './patient/PatientHome.jsx'
import PatientAppointments from './agenda/PatientAppointments.jsx'
import Booking from './agenda/Booking.jsx'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { USE_MOCK, authenticateMockUser, getMockLoginUsers, startGoogleLogin, logoutSession, clearSession, getCurrentUser } from './api.jsx'
import './style.css'
import Users from './users/Users.jsx'
import Agenda from './agenda/Agenda.jsx'

const inputClass = 'w-full rounded-xl border border-ink/20 bg-white px-4 py-3.5 text-sm text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/25'

function App() {
  const [inboxOpen, setInboxOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
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
    try {
      for (const key of ['agenda-sa.session', 'agenda-sa.mock-session']) sessionStorage.removeItem(key)
    } catch { /* Browser storage may be unavailable. */ }
    getCurrentUser({ authenticated: false }).then(current => { if (active && version === generation.current) setUser(current) })
      .catch(problem => { if (active && version === generation.current && problem.status !== 401) setError(problem.message) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    function expired() {
      generation.current += 1
      clearSession()
      setUser(null)
      setBooking(false)
      setInboxOpen(false)
      setError('Sua sessão expirou. Entre novamente.')
    }
    window.addEventListener('session-expired', expired)
    return () => window.removeEventListener('session-expired', expired)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('auth_error')
    if (!code) return
    setError(code === 'invite_invalid' ? 'Convite inválido ou expirado. Solicite um novo convite.'
      : 'Não foi possível entrar com Google. O acesso pode ter sido cancelado ou a conta não estar autorizada. Verifique seu convite ou fale com a administração.')
    url.searchParams.delete('auth_error')
    window.history.replaceState(null, '', url)
  }, [])

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setError('')
    setBusy(true)
    try {
      if (USE_MOCK) await authenticateMockUser(fields.get('mockUser'))
      else { startGoogleLogin(); return }
      setUser(await getCurrentUser())
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await logoutSession()
    } catch (problem) {
      try {
        await getCurrentUser({ authenticated: false })
        setError('Não foi possível encerrar a sessão. Tente novamente.')
        setBusy(false)
        return
      } catch (check) {
        if (check.status !== 401) {
          setError('Não foi possível confirmar o encerramento da sessão. Tente novamente.')
          setBusy(false)
          return
        }
      }
    }
    generation.current += 1
    clearSession()
    setUser(null)
    setBooking(false)
    setInboxOpen(false)
    setError('')
    setBusy(false)
    window.location.hash = ''
  }

  if (!checking && user) {
    const patient = user.perfil === 'PACIENTE'
    const appointmentsPage = ['#/minhas-consultas', '#/minhas-consultas/', '#/agendamentos'].includes(hash)
    const doctorsPage = hash === '#/medicos'
    const profilePage = hash === '#/cadastro'
    const admin = user.perfil === 'ADMIN'
    const agendaPage = hash === '#/agenda' || hash === '#/agenda/'
    const usersPage = hash.startsWith('#/usuarios')
    return <main className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-ink/15 bg-pine text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-8">
          <a href="#/" className="flex items-center gap-3 font-semibold"><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-mint text-2xl text-pine">+</span>Agenda SA</a>
          <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-5 text-sm">
            <a href="#/" aria-current={!usersPage && !agendaPage && !appointmentsPage && !doctorsPage && !profilePage ? 'page' : undefined} className="hover:underline">Início</a>
            {!admin && <a href="#/minhas-consultas" aria-current={appointmentsPage ? "page" : undefined} className="hover:underline">Minhas consultas</a>}
            <a href="#/agenda" aria-current={agendaPage ? "page" : undefined} className="hover:underline">Agenda</a>
            {admin && <a href="#/usuarios" aria-current={usersPage ? 'page' : undefined} className="font-semibold hover:underline">Usuários</a>}
            {admin && <a href="#/medicos" aria-current={doctorsPage ? 'page' : undefined} className="hover:underline">Médicos</a>}
            {admin && <a href="#/agendamentos" aria-current={appointmentsPage ? 'page' : undefined} className="hover:underline">Agendamentos</a>}
            <button type="button" onClick={() => setInboxOpen(true)} aria-label="Abrir caixa de entrada de notificações" aria-haspopup="dialog" aria-expanded={inboxOpen} aria-controls={inboxOpen ? 'notifications-inbox' : undefined} className="rounded-xl border border-white/30 p-2.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>
            <a href="#/cadastro" aria-current={profilePage ? 'page' : undefined} className="hover:underline">Meu cadastro</a>
            <span>{user.nome} · {user.perfil}</span>
            <button disabled={busy} onClick={logout} className="rounded-xl border border-white/40 px-4 py-2 hover:bg-white/10">{busy ? 'Saindo…' : 'Sair'}</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {profilePage ? <Profile user={user} onUpdated={onSelfChange} /> : admin && doctorsPage ? <Doctors /> : agendaPage ? <Agenda /> : appointmentsPage ? <><PatientAppointments key={user.id} user={user} refresh={booking} />{admin && <button onClick={() => setBooking(true)} className="mt-6 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white">Novo agendamento</button>}</> : patient && !usersPage ? <PatientHome user={user} onBook={() => setBooking(true)} /> : admin && usersPage ? <Users key={user.id} hash={hash} user={user} onForbidden={onForbidden} onSelfChange={onSelfChange} /> : <>
          {!admin && usersPage && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">A administração de usuários é exclusiva do perfil ADMIN.</p>}
          <h1 className="font-serif text-4xl md:text-5xl">Olá, {user.nome}</h1>
          <p className="mt-5 text-ink/75">Você está conectado à Agenda SA.</p>
          {user.perfil === "PACIENTE" && <button onClick={() => setBooking(true)} className="mt-8 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-ink">Agendar consulta</button>}

          {admin && <a href="#/usuarios" className="mt-8 inline-block rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-ink">Gerenciar usuários</a>}
        </>}
      </div>
      {inboxOpen && <SidePanel id="notifications-inbox" title="Caixa de entrada" onClose={() => setInboxOpen(false)}><Notifications /></SidePanel>}
      {booking && <Booking user={user} onClose={() => setBooking(false)} />}
    </main>
  }

  return (
    <main className="min-h-dvh bg-paper p-5 text-ink md:grid md:grid-cols-[0.95fr_1fr] md:gap-8 md:p-6">
      <aside className="agenda-pattern flex flex-col justify-between rounded-3xl bg-pine px-7 py-6 text-white md:min-h-[calc(100dvh-3rem)] md:p-12 xl:p-16">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-mint text-2xl text-pine">+</span>
          Agenda SA
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
            {USE_MOCK && <p role="status" className="mt-3 font-semibold text-pine">Modo demonstração — sem conexão com a API</p>}
            <p className="mt-3 text-sm text-ink/75">{USE_MOCK ? 'Selecione uma conta para entrar.' : 'Acesse suas consultas com sua conta Google autorizada.'}</p>
            <form onSubmit={submit} onChange={() => setError('')} className="mt-9 grid gap-5">
              {USE_MOCK ? <div>
                <label htmlFor="mock-user" className="mb-2 block text-sm font-semibold">Usuário</label>
                <select id="mock-user" name="mockUser" className={inputClass} defaultValue="" required disabled={busy}>
                  <option value="" disabled>Selecione um usuário</option>
                  {getMockLoginUsers().map(account => <option key={account.id} value={account.id}>{account.nome} · {account.perfil}</option>)}
                </select>
              </div> : null}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              {error && <button type="button" onClick={() => window.location.reload()} className="text-sm font-semibold text-pine underline">Verificar sessão novamente</button>}
              <button disabled={busy} className="mt-1 w-full rounded-xl bg-pine px-5 py-3.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-60">{busy ? 'Aguarde…' : USE_MOCK ? 'Entrar na demonstração' : 'Entrar com Google'}</button>
            </form>
          </>}
        </div>
      </section>
      {inboxOpen && <SidePanel id="notifications-inbox" title="Caixa de entrada" onClose={() => setInboxOpen(false)}><Notifications /></SidePanel>}
      {booking && <Booking user={user} onClose={() => setBooking(false)} />}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)









