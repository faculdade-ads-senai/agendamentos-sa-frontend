import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { authenticate, currentUser, signOut } from './mockAuth'
import './style.css'

const inputClass = 'w-full rounded-xl border border-ink/20 bg-white px-4 py-3.5 text-sm text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/25'

function App() {
  const [user, setUser] = useState(currentUser)
  const [register, setRegister] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setError('')
    setBusy(true)
    try {
      setUser(await authenticate({ email: fields.get('email'), password: fields.get('password'), register }))
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setRegister(!register)
    setError('')
    setVisible(false)
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
        {user ? (
          <div className="w-full max-w-sm">
            <h1 className="font-serif text-5xl tracking-tight">Em desenvolvimento</h1>
            <p className="mt-4 break-all text-sm text-ink/70">{user}</p>
            <button className="mt-8 rounded-xl bg-pine px-6 py-3 font-semibold text-white hover:bg-ink" onClick={() => { signOut(); setUser(null); setRegister(false); setVisible(false) }}>Sair</button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <h1 className="font-serif text-5xl tracking-tight">{register ? 'Crie sua conta' : 'Bem-vindo'}</h1>
            <p className="mt-3 text-sm text-ink/75">{register ? 'Cadastre seu e-mail e escolha uma senha.' : 'Entre para acessar sua agenda.'}</p>
            <form key={String(register)} onSubmit={submit} className="mt-9 grid gap-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">E-mail</label>
                <input className={inputClass} id="email" name="email" type="email" autoComplete="email" placeholder="nome@exemplo.com" required />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">Senha</label>
                <div className="relative">
                  <input className={`${inputClass} pr-24`} id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required />
                  <button type="button" className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-pine hover:underline" onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
                </div>
                {register && <p className="mt-2 text-xs text-ink/70">Use pelo menos 8 caracteres.</p>}
              </div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <button disabled={busy} className="mt-1 rounded-xl bg-pine px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60">{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
            </form>
            <p className="mt-7 text-center text-sm text-ink/75">
              {register ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
              <button type="button" disabled={busy} onClick={switchMode} className="font-semibold text-pine underline underline-offset-4">{register ? 'Entrar' : 'Criar conta'}</button>
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
