import React, { useEffect, useState } from 'react'
import { cancelAppointment, rescheduleAppointment, getAvailableTimes } from '../api.jsx'
import Modal from '../components/Modal.jsx'
import { Field, Feedback, fieldClass, buttonClass } from '../components/Form.jsx'

export default function AppointmentAction({ appointment, action, onClose, onSaved }) {
  const [day, setDay] = useState('')
  const [times, setTimes] = useState([])
  const [start, setStart] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!day || action !== 'reschedule') return
    let active = true
    setStart(''); setLoading(true); setError('')
    getAvailableTimes(appointment.medicoId, day).then(items => { if (active) setTimes(items) })
      .catch(problem => { if (active) setError(problem.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [day, appointment.medicoId, action])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (action === 'cancel') await cancelAppointment(appointment.id, reason.trim())
      else await rescheduleAppointment(appointment.id, start, reason.trim())
      await onSaved()
    } catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }
  return <Modal title={action === 'cancel' ? 'Cancelar consulta' : 'Reagendar consulta'} onClose={busy ? () => {} : onClose}>
    <p className="mb-5 text-sm">{appointment.especialidade} · {appointment.medico}</p>
    <form onSubmit={submit}><fieldset disabled={busy} className="grid gap-4">
      {action === 'reschedule' && <>
        <Field label="Novo dia" type="date" required value={day} onChange={event => setDay(event.target.value)} />
        {loading ? <p role="status">Buscando horários…</p> : day && <label className="grid gap-2 text-sm">Novo horário<select className={fieldClass} required value={start} onChange={event => setStart(event.target.value)}><option value="">Selecione</option>{times.map(item => <option key={item.inicio} value={item.inicio}>{new Date(item.inicio).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</option>)}</select>{!times.length && 'Nenhum horário disponível.'}</label>}
      </>}
      <Field label={action === 'cancel' ? 'Motivo do cancelamento' : 'Motivo (opcional)'} required={action === 'cancel'} maxLength={255} value={reason} onChange={event => setReason(event.target.value)} />
      <Feedback error={error} />
      <button disabled={busy || loading || (action === 'reschedule' && !start)} className={buttonClass}>{busy ? 'Enviando…' : 'Confirmar'}</button>
    </fieldset></form>
  </Modal>
}
