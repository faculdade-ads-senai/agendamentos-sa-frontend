import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { authenticate, createAccount } from './api.jsx'
import './style.css'

const inputClass = 'w-full rounded-xl border border-ink/20 bg-white px-4 py-3.5 text-sm text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/25'

function App() {
  const [register, setRegister] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setError('')
    setNotice('')
    setFeedback(null)
    setBusy(true)
    try {
      if (!register) {
        const valid = await authenticate({ email: fields.get('email'), password: fields.get('password') })
        setFeedback({ valid, message: valid ? 'Credenciais válidas.' : 'E-mail ou senha incorretos.' })
        return
      }
      await createAccount({
        name: fields.get('name'),
        email: fields.get('email'),
        password: fields.get('password'),
      })
      event.target.reset()
      setNotice('Conta criada com sucesso.')
    } catch (problem) {
      if (register) setError(problem.message)
      else setFeedback({ valid: false, message: problem.message })
    } finally {
      setBusy(false)
    }
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
            <h1 className="font-serif text-5xl tracking-tight">{register ? 'Crie sua conta' : 'Bem-vindo'}</h1>
            <p className="mt-3 text-sm text-ink/75">{register ? 'Informe seus dados para criar sua conta.' : 'Informe seu e-mail e sua senha.'}</p>
            <form key={String(register)} onChange={() => setFeedback(null)} onSubmit={submit} className="mt-9 grid gap-5">
              
                {register && <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-semibold">Nome</label>
                  <input className={inputClass} id="name" name="name" autoComplete="name" maxLength={120} required />
                </div>}
      
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">E-mail</label>
                <input className={inputClass} id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="nome@exemplo.com" required />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">Senha</label>
                <div className="relative">
                  <input className={`${inputClass} pr-24`} id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} maxLength={72} required />
                  <button type="button" className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-pine hover:underline" onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
                </div>
                {register && <p className="mt-2 text-xs text-ink/70">Use pelo menos 8 caracteres.</p>}
              </div>
              {notice && <p role="status" className="rounded-lg bg-mint p-3 text-sm">{notice}</p>}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <div className="relative pb-2"><button aria-describedby={feedback ? "login-feedback" : undefined} disabled={busy} className="w-full mt-1 rounded-xl bg-pine px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60">{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
                <div role="status" aria-live="polite">
                  {feedback && <p id="login-feedback" className={`relative mt-2 rounded-lg px-3 py-2 text-sm before:absolute before:-top-1 before:left-5 before:size-2 before:rotate-45 before:bg-inherit before:content-[""] ${feedback.valid ? 'bg-mint text-pine' : 'bg-red-50 text-red-800'}`}>{feedback.message}</p>}
                </div>
              </div>
            </form>
            <button type="button" disabled={busy} className="mt-5 text-sm font-semibold text-pine underline" onClick={() => {
              setRegister(!register)
              setVisible(false)
              setFeedback(null)
              setNotice('')
              setError('')
            }}>{register ? 'Voltar ao login' : 'Criar conta'}</button>
            {register && <a className="ml-4 mt-6 inline-block text-sm font-semibold text-pine underline" href="/login">Autenticar no Spring Security</a>}
          </div>

      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)




