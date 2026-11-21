import Calendar from './Calendar.jsx'
import React, { useCallback, useEffect, useState } from 'react'
import { getAppointments } from '../api.jsx'
import Modal from '../components/Modal.jsx'

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const fullDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' })
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const controlClass = 'rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-mint/50 focus-visible:outline-2 focus-visible:outline-pine'

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7))
}

function sameDay(left, right) {
  return left.toDateString() === right.toDateString()
}

function DayNumber({ date, today }) {
  return <span className={`inline-flex size-8 items-center justify-center rounded-full text-sm ${sameDay(date, today) ? 'bg-pine font-semibold text-white' : ''}`}>{date.getDate()}</span>
}

export default function Agenda() {
  const [appointments, setAppointments] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const closeModal = useCallback(() => setSelected(null), [])
  useEffect(() => {
    let active = true
    getAppointments().then(items => { if (active) setAppointments(items) })
      .catch(problem => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])

  function eventsFor(day, hour) {
    return appointments.filter(item => {
      const start = new Date(item.inicio)
      return sameDay(start, day) && (hour === undefined || start.getHours() === hour)
    }).sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
  }

  function eventButton(item) {
    const time = new Date(item.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return <button key={item.id} type="button" onClick={() => setSelected(item)} className="my-1 block w-full rounded-md border-l-2 border-pine bg-mint px-2 py-1 text-left text-xs text-pine hover:bg-pine hover:text-white focus-visible:outline-2 focus-visible:outline-pine">
      <span className="block font-semibold">{time} · {item.tipo}</span>
      <span className="block truncate">{item.paciente}</span>
    </button>
  }

  return <section>
    {error && <p role="alert">{error}</p>}
    <Calendar appointments={appointments} eventButton={eventButton} />
    {selected && <Modal title="Detalhes da consulta" onClose={closeModal}>
      <p className="mb-6 text-lg font-semibold">{selected.paciente}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-sm">
        <dt className="text-ink/60">Data</dt><dd>{fullDate.format(new Date(selected.inicio))}</dd>
        <dt className="text-ink/60">Horário</dt><dd>{new Date(selected.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às {new Date(selected.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>
        <dt className="text-ink/60">Tipo</dt><dd>{selected.tipo}</dd>
        <dt className="text-ink/60">Status</dt><dd>{selected.status}</dd>
        <dt className="text-ink/60">Médico</dt><dd>{selected.medico}</dd>
      </dl>
      {selected.observacoes && <p className="mt-6 rounded-xl bg-mint/50 p-4 text-sm">{selected.observacoes}</p>}
    </Modal>}
  </section>
}





