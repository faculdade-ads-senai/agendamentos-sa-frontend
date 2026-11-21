import React, { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import Calendar from './Calendar.jsx'
import { getSpecialties, getAvailableTimes, bookAppointment, listAll } from '../api.jsx'

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export default function Booking({ onClose, user }) {
  const [patients, setPatients] = useState([])
  const [patientId, setPatientId] = useState('')
  const [specialties, setSpecialties] = useState([])
  const [specialty, setSpecialty] = useState('')
  const [day, setDay] = useState(null)
  const [times, setTimes] = useState([])
  const [time, setTime] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    if (user.perfil === 'ADMIN') listAll('/api/v1/usuarios').then(items => { if (active) setPatients(items.filter(item => item.perfil === 'PACIENTE' && item.ativo)) }).catch(problem => { if (active) setError(problem.message) })
    getSpecialties().then(items => { if (active) setSpecialties(items) })
      .catch(problem => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!day || !specialty) return
    let active = true
    setLoading(true)
    setError('')
    getAvailableTimes(specialty, dateKey(day)).then(items => { if (active) setTimes(items) })
      .catch(problem => { if (active) setError(problem.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [specialty, day])

  async function submit(event) {
    event.preventDefault()
    if (busy || !day || !time) return
    setBusy(true)
    setError('')
    try {
      await bookAppointment({ especialidade: specialty, dia: dateKey(day), inicio: time, pacienteId: patientId })
      setSuccess(true)
    } catch (problem) {
      setError(problem.message)
      setTime('')
      getAvailableTimes(specialty, dateKey(day)).then(setTimes).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  return <Modal title="Agendar consulta" onClose={busy ? () => {} : onClose}>
    {success ? <div>
      <p role="status" className="rounded-xl bg-mint p-4 text-pine">Consulta agendada com sucesso.</p>
      <p className="mt-4 text-sm">{day.toLocaleDateString('pt-BR')} às {new Date(time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</p>
      <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-pine px-5 py-3 text-white">Concluir</button>
    </div> : <form onSubmit={submit} className="grid gap-5">
      <fieldset disabled={busy} className="grid min-w-0 gap-5">
        {user.perfil === 'ADMIN' && <label className="grid gap-2 text-sm font-semibold">Paciente<select required className="rounded-xl border border-ink/20 bg-white p-3" value={patientId} onChange={event => setPatientId(event.target.value)}><option value="">Selecione o paciente</option>{patients.map(item => <option key={item.id} value={item.id}>{item.nome} · {item.email}</option>)}</select></label>}        <div>
          <label htmlFor="specialty" className="mb-2 block text-sm font-semibold">Especialidade</label>
          <select id="specialty" value={specialty} required onChange={event => {
            setSpecialty(event.target.value); setDay(null); setTime(''); setTimes([]); setError('')
          }} className="w-full rounded-xl border border-ink/20 bg-white p-3">
            <option value="">Selecione a especialidade</option>
            {specialties.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          {specialties.length === 0 && !error && <p className="mt-2 text-sm text-ink/60">Nenhuma especialidade disponível.</p>}
        </div>
        {specialty && <Calendar selectedDate={day} onSelectDate={value => { setDay(value); setTime(''); setTimes([]) }} />}
        {day && <div>
          <p className="mb-3 text-sm font-semibold">Horário · {day.toLocaleDateString('pt-BR')}</p>
          {loading ? <p role="status">Buscando horários…</p> : <div className="flex flex-wrap gap-2">
            {times.map(value => <button key={value.inicio} type="button" aria-pressed={time === value.inicio} onClick={() => setTime(value.inicio)} className={`rounded-lg border border-pine/30 px-4 py-2 text-sm ${time === value.inicio ? 'bg-pine text-white' : 'hover:bg-mint'}`}>{new Date(value.inicio).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</button>)}
            {!times.length && <p className="text-sm text-ink/60">Nenhum horário disponível neste dia.</p>}
          </div>}
        </div>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button disabled={!time || loading || busy} className="rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Enviando…' : 'Enviar agendamento'}</button>
      </fieldset>
    </form>}
  </Modal>
}



