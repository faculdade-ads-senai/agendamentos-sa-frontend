import React, { useEffect, useState } from 'react'
import { listDoctors, saveDoctor, getDoctorSchedule, saveDoctorSchedule, listBlocks, createBlock, removeBlock } from '../api.jsx'
import Modal from '../components/Modal.jsx'
import { Field, Feedback, fieldClass, buttonClass, secondaryClass } from '../components/Form.jsx'

const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export default function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [editing, setEditing] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    listDoctors().then(items => { if (active) setDoctors(items) })
      .catch(problem => { if (active) setError(problem.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])
  return <section>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="font-serif text-4xl">Médicos</h1><button className={buttonClass} onClick={() => setEditing({})}>Cadastrar médico</button></div>
    <Feedback error={error} />
    {loading ? <p role="status">Carregando médicos…</p> : <div className="grid gap-4 md:grid-cols-2">
      {doctors.map(item => <article key={item.id} className="rounded-2xl border border-ink/15 bg-white p-6">
        <h2 className="text-lg font-semibold">{item.nome}</h2><p className="mt-2 text-sm">{item.especialidade} · CRM {item.crm}/{item.ufCrm}</p><p className="mt-2 text-sm text-ink/60">{item.email} · {item.ativo ? 'Ativo' : 'Inativo'}</p>
        <div className="mt-5 flex flex-wrap gap-3"><button className={secondaryClass} onClick={() => setEditing(item)}>Editar</button><button className={secondaryClass} onClick={() => setSchedule(item)}>Disponibilidade e bloqueios</button></div>
      </article>)}
      {!doctors.length && <p>Nenhum médico cadastrado.</p>}
    </div>}
    {editing && <DoctorForm doctor={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setRefresh(value => value + 1) }} />}
    {schedule && <Schedule doctor={schedule} onClose={() => setSchedule(null)} />}
  </section>
}

function DoctorForm({ doctor, onClose, onSaved }) {
  const [values, setValues] = useState({ nome: '', email: '', crm: '', ufCrm: '', especialidade: '', ativo: true, ...doctor })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const { nome, email, crm, ufCrm, especialidade, ativo } = values
    try {
      await saveDoctor({ nome: nome.trim(), email: email.trim(), crm: crm.trim(), ufCrm, especialidade: especialidade.trim(), ...(doctor.id ? { ativo } : {}) }, doctor.id)
      onSaved()
    } catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }
  return <Modal title={doctor.id ? 'Editar médico' : 'Cadastrar médico'} onClose={busy ? () => {} : onClose}>
    <form onSubmit={submit}><fieldset disabled={busy} className="grid gap-4">
      {[['nome', 'Nome', 120], ['email', 'E-mail', 254], ['crm', 'CRM', 20], ['ufCrm', 'UF do CRM', 2], ['especialidade', 'Especialidade', 100]].map(([key, label, max]) => <Field key={key} label={label} value={values[key]} maxLength={max} type={key === 'email' ? 'email' : 'text'} pattern={key === 'ufCrm' ? '[A-Z]{2}' : undefined} required onChange={event => setValues({ ...values, [key]: key === 'ufCrm' ? event.target.value.toUpperCase() : event.target.value })} />)}
      {doctor.id && <label className="text-sm"><input type="checkbox" checked={values.ativo} onChange={event => setValues({ ...values, ativo: event.target.checked })} /> Médico ativo</label>}
      <Feedback error={error} /><button className={buttonClass}>{busy ? 'Salvando…' : 'Salvar médico'}</button>
    </fieldset></form>
  </Modal>
}

function Schedule({ doctor, onClose }) {
  const [windows, setWindows] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([getDoctorSchedule(doctor.id), listBlocks(doctor.id)]).then(([agenda, items]) => {
      if (active) { setWindows(agenda.janelas); setBlocks(items) }
    }).catch(problem => { if (active) setError(problem.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [doctor.id])
  function change(index, key, value) {
    setWindows(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }
  async function run(action, message) {
    setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(message) }
    catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }
  async function block(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    await run(async () => {
      await createBlock(doctor.id, { inicio: new Date(data.get('inicio') + ':00-03:00').toISOString(), fim: new Date(data.get('fim') + ':00-03:00').toISOString(), motivo: data.get('motivo') })
      setBlocks(await listBlocks(doctor.id))
      form.reset()
    }, 'Bloqueio criado.')
  }
  return <Modal title={'Disponibilidade · ' + doctor.nome} onClose={busy ? () => {} : onClose}>
    <Feedback error={error} notice={notice} />
    {loading ? <p role="status">Carregando disponibilidade…</p> : <fieldset disabled={busy || !doctor.ativo} className="grid min-w-0 gap-5">
      <legend className="mb-4 font-semibold">Agenda semanal</legend>
      {!doctor.ativo && <p className="text-sm text-red-800">Reative o médico para alterar sua disponibilidade.</p>}
      {windows.map((item, index) => <div key={index} className="grid grid-cols-2 gap-3 rounded-xl border border-ink/15 p-3">
        <label className="text-sm">Dia<select aria-label="Dia da semana" className={fieldClass} value={item.diaSemana} onChange={event => change(index, 'diaSemana', Number(event.target.value))}>{days.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}</select></label>
        <Field label="Duração (min)" type="number" min={30} max={60} value={item.duracaoMinutos} onChange={event => change(index, 'duracaoMinutos', Number(event.target.value))} />
        <Field label="Início" type="time" value={item.horaInicio} onChange={event => change(index, 'horaInicio', event.target.value)} />
        <Field label="Fim" type="time" value={item.horaFim} onChange={event => change(index, 'horaFim', event.target.value)} />
        <button className={secondaryClass} onClick={() => setWindows(items => items.filter((_, i) => i !== index))}>Remover janela</button>
      </div>)}
      {!windows.length && <p className="text-sm text-ink/60">Sem janelas de atendimento. Salvar assim desativa a agenda semanal.</p>}
      <button className={secondaryClass} onClick={() => setWindows(items => [...items, { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00', duracaoMinutos: 30 }])}>Adicionar janela</button>
      <button className={buttonClass} onClick={() => run(() => saveDoctorSchedule(doctor.id, windows), 'Agenda semanal salva.')}>{busy ? 'Salvando…' : 'Salvar agenda semanal'}</button>
      <h3 className="mt-3 font-semibold">Bloqueios de agenda</h3>
      {blocks.map(item => <div key={item.id} className="rounded-xl border border-ink/15 p-3 text-sm"><p>{item.motivo}</p><p className="my-2 text-ink/60">{new Date(item.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} até {new Date(item.fim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p><button className={secondaryClass} onClick={() => run(async () => { await removeBlock(doctor.id, item.id); setBlocks(await listBlocks(doctor.id)) }, 'Bloqueio removido.')}>Remover bloqueio</button></div>)}
      {!blocks.length && <p className="text-sm text-ink/60">Nenhum bloqueio ativo.</p>}
      <form onSubmit={block} className="grid gap-3">
        <Field label="Início do bloqueio" name="inicio" type="datetime-local" required />
        <Field label="Fim do bloqueio" name="fim" type="datetime-local" required />
        <Field label="Motivo" name="motivo" maxLength={255} required />
        <button className={buttonClass}>Criar bloqueio</button>
      </form>
    </fieldset>}
  </Modal>
}
