import React, { useEffect, useState } from 'react'
import { getClinic } from '../api.jsx'

export default function PatientHome({ user, onBook }) {
  const [clinic, setClinic] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getClinic().then(data => { if (active) setClinic(data) })
      .catch(problem => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])

  return <>
    <p className="mb-5 text-sm text-ink/65">Olá, {user.nome}</p>
    <section className="rounded-3xl bg-pine px-7 py-10 text-white md:p-12">
      <p className="mb-4 text-sm text-mint">{clinic?.nome || 'Agenda Médica'}</p>
      <h1 className="max-w-xl font-serif text-4xl md:text-6xl">{clinic?.apresentacao || 'Seu cuidado começa por aqui.'}</h1>
      {clinic?.descricao && <p className="mt-5 max-w-lg text-white/75">{clinic.descricao}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={onBook} className="rounded-xl bg-mint px-5 py-3 text-sm font-semibold text-pine hover:bg-white">Agendar consulta</button>
        <a href="#/minhas-consultas" className="rounded-xl border border-white/35 px-5 py-3 text-sm font-semibold hover:bg-white/10">Minhas consultas</a>
      </div>
    </section>
    {error && <p role="alert" className="mt-5 text-sm text-red-800">{error}</p>}
    <section className="mt-10" aria-labelledby="clinic-doctors">
      <h2 id="clinic-doctors" className="mb-5 font-serif text-3xl">Nossa equipe médica</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clinic?.medicos?.map(doctor => <article key={doctor.id} className="rounded-2xl border border-ink/15 bg-white p-6">
          <div aria-hidden="true" className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-mint text-xl font-semibold text-pine">{doctor.nome.split(' ').map(part => part[0]).slice(0, 2).join('')}</div>
          <h3 className="font-semibold">{doctor.nome}</h3>
          <p className="mt-1 text-sm text-ink/65">{doctor.especialidade}</p>
          <button onClick={onBook} className="mt-5 text-sm font-semibold text-pine underline underline-offset-4">Agendar consulta</button>
        </article>)}
      </div>
      {clinic && !clinic.medicos?.length && <p className="text-sm text-ink/65">A equipe médica será exibida aqui.</p>}
    </section>
    {clinic?.orientacoes && <aside className="mt-8 rounded-2xl border border-ink/15 p-6">
      <h2 className="mb-2 font-semibold">Antes da consulta</h2>
      <p className="max-w-3xl text-sm leading-relaxed text-ink/70">{clinic.orientacoes}</p>
    </aside>}
  </>
}
