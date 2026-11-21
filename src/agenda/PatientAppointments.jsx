import AppointmentAction from './AppointmentAction.jsx'
import React, { useEffect, useState } from 'react'
import { getAppointments } from '../api.jsx'

export default function PatientAppointments({ refresh, user }) {
  const [action, setAction] = useState(null)
  const [revision, setRevision] = useState(0)
  const [filter, setFilter] = useState('')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAppointments().then(items => {
      if (active) setAppointments([...items].sort((a, b) => new Date(a.inicio) - new Date(b.inicio)))
    }).catch(problem => { if (active) setError(problem.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh, revision])

  const now = Date.now()
  const filtered = appointments.filter(item => !filter || [item.paciente, item.medico, item.especialidade, item.status].join(' ').toLowerCase().includes(filter.toLowerCase()))
  const upcoming = filtered.filter(item => item.status === 'AGENDADA' && new Date(item.fim || item.inicio).getTime() >= now)
  const history = filtered.filter(item => item.status !== 'AGENDADA' || new Date(item.fim || item.inicio).getTime() < now).reverse()

  function group(title, items, empty) {
    return <section className="mt-8">
      <h2 className="mb-5 font-serif text-3xl">{title}</h2>
      {items.length === 0 ? <p className="rounded-2xl border border-ink/15 bg-white p-6 text-sm text-ink/65">{empty}</p>
        : <ul className="grid gap-4 md:grid-cols-2">        {items.map(item => {
          const start = new Date(item.inicio)
          return <li key={item.id} className="rounded-2xl border border-ink/15 bg-white p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{item.especialidade || item.tipo}</h3>
              <span className="rounded-full bg-mint px-3 py-1 text-xs text-pine">{item.status}</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
              <dt className="text-ink/60">Dia</dt><dd>{start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</dd>
              <dt className="text-ink/60">Horário</dt><dd>{start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>
              <dt className="text-ink/60">Médico</dt><dd>{item.medico || 'A confirmar'}</dd>
              {user.perfil !== 'PACIENTE' && <><dt className="text-ink/60">Paciente</dt><dd>{item.paciente}</dd></>}
            </dl>
            {item.motivoCancelamento && <p className="mt-4 text-sm text-ink/65">Motivo do cancelamento · {item.motivoCancelamento}</p>}
            {item.status === 'AGENDADA' && new Date(item.inicio).getTime() > Date.now() && <div className="mt-5 flex flex-wrap gap-4">
              {user.perfil !== 'MEDICO' && <button disabled={user.perfil === 'PACIENTE' && new Date(item.inicio).getTime() - Date.now() < 86400000} onClick={() => setAction({ appointment: item, action: 'reschedule' })} className="text-sm font-semibold text-pine underline disabled:opacity-40">Reagendar</button>}
              <button disabled={user.perfil === 'PACIENTE' && new Date(item.inicio).getTime() - Date.now() < 86400000} onClick={() => setAction({ appointment: item, action: 'cancel' })} className="text-sm font-semibold text-red-800 underline disabled:opacity-40">Cancelar</button>
              {user.perfil === 'PACIENTE' && new Date(item.inicio).getTime() - Date.now() < 86400000 && <p className="text-xs text-ink/60">Para alterações com menos de 24 horas, fale com a clínica.</p>}
            </div>}
          </li>
        })}
        </ul>}
    </section>
  }

  return <section aria-labelledby="patient-appointments">
    <h1 id="patient-appointments" className="font-serif text-4xl md:text-5xl">{user.perfil === 'ADMIN' ? 'Agendamentos' : 'Minhas consultas'}</h1>
    <label className="mt-5 grid max-w-md gap-2 text-sm">Buscar consultas<input type="search" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-ink/20 bg-white px-4 py-3" placeholder="Nome, especialidade ou status" /></label>
    {loading ? <p role="status" className="mt-6 text-sm text-ink/65">Carregando consultas…</p>
      : error ? <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>
      : <>
        {group('Próximas consultas', upcoming, 'Você não tem consultas próximas.')}
        {group('Histórico', history, 'Seu histórico de consultas está vazio.')}
      </>}
    {action && <AppointmentAction {...action} onClose={() => setAction(null)} onSaved={() => { setAction(null); setRevision(value => value + 1) }} />}
  </section>
}

