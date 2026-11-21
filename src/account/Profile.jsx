import React, { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../api.jsx'
import { Field, Feedback, buttonClass } from '../components/Form.jsx'

export default function Profile({ onUpdated }) {
  const [values, setValues] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    getProfile().then(item => { if (active) setValues({ nome: item.nome, email: item.email }) })
      .catch(problem => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])
  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await updateProfile(values)
      await onUpdated()
      setNotice('Cadastro atualizado.')
    } catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }
  return <section>
    <h1 className="font-serif text-4xl">Meu cadastro</h1>
    <Feedback error={error} notice={notice} />
    {values ? <form onSubmit={submit} className="mt-8 max-w-lg rounded-2xl border border-ink/15 bg-white p-6">
      <fieldset disabled={busy} className="grid gap-5">
        <Field label="Nome" value={values.nome} required maxLength={120} onChange={event => setValues({ ...values, nome: event.target.value })} />
        <Field label="E-mail" type="email" value={values.email} required maxLength={254} onChange={event => setValues({ ...values, email: event.target.value })} />
        <button className={buttonClass}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
      </fieldset>
    </form> : !error && <p role="status" className="mt-5">Carregando cadastro…</p>}
  </section>
}
