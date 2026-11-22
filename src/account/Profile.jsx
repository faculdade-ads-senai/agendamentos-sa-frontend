import PersonalFields from '../users/PersonalFields.jsx'
import { validateContacts } from '../users/personal.js'
import React, { useEffect, useRef, useState } from 'react'
import { getPersonal, updateProfile } from '../api.jsx'
import { Field, Feedback, buttonClass } from '../components/Form.jsx'

export default function Profile({ onUpdated, user }) {
  const [values, setValues] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    let active = true
    getPersonal().then(item => { if (active) setValues(item) })
      .catch(problem => { if (active) setError(problem.message) })
    return () => { active = false; mounted.current = false }
  }, [])
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const validation = validateContacts(values)
    if (validation) { setError(validation); return }
    setBusy(true); setError(''); setNotice('')
    try {
      await updateProfile({ nome: values.nome, telefone: values.telefone, endereco: values.endereco })
      await onUpdated()
      const updated = await getPersonal()
      if (mounted.current) { setValues(updated); setNotice('Cadastro atualizado.') }
    } catch (problem) { if (mounted.current) setError(problem.message) }
    finally { if (mounted.current) setBusy(false) }
  }
  return <section>
    <h1 className="font-serif text-4xl">Meu cadastro</h1>
    {user?.perfil === 'ADMIN' && <a className="mt-4 inline-block text-pine underline" href={`#/usuarios/${user.id}/editar`}>Editar meu cadastro completo</a>}
    <Feedback error={error} notice={notice} />
    {values ? <form onSubmit={submit} className="mt-8 max-w-lg rounded-2xl border border-ink/15 bg-white p-6">
      <fieldset disabled={busy} className="grid gap-5">
        <Field label="Nome" value={values.nome} required maxLength={120} onChange={event => setValues({ ...values, nome: event.target.value })} />
        <PersonalFields values={values} readOnlyIdentity onChange={(name, value) => setValues(previous => ({ ...previous, [name]: value }))} />
        {!values.cadastroCompleto && <p role="status">Cadastro incompleto. Solicite a regularização ao administrador.</p>}
        <Field label="E-mail Google" type="email" value={values.email} readOnly />
        <button className={buttonClass}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
      </fieldset>
    </form> : !error && <p role="status" className="mt-5">Carregando cadastro…</p>}
  </section>
}
