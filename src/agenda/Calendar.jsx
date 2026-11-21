import React, { useState } from 'react'



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

export default function Calendar({ appointments = [], eventButton, onSelectDate, selectedDate }) {
  function eventsFor(day, hour) {
    return appointments.filter(item => {
      const start = new Date(item.inicio)
      return sameDay(start, day) && (hour === undefined || start.getHours() === hour)
    }).sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
  }

  const [view, setView] = useState('month')
  const [date, setDate] = useState(() => new Date())
  const today = new Date()
  const weekStart = startOfWeek(date)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const count = Math.ceil((((monthStart.getDay() + 6) % 7) + lastDay.getDate()) / 7) * 7
  const monthDays = Array.from({ length: count }, (_, index) => addDays(gridStart, index))

  function move(direction) {
    setDate(current => view === 'month'
      ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
      : addDays(current, direction * 7))
  }

  return <section aria-label="Agenda">

    <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
      <h2 className="font-serif text-3xl">{onSelectDate ? "Escolha o dia" : "Agenda"}</h2>
      <div aria-label="Visualização da agenda" className="flex rounded-xl border border-ink/15 bg-white p-1">
        {[['month', 'Mensal'], ['week', 'Semanal']].map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-pine ${view === value ? 'bg-pine text-white' : 'text-ink/70 hover:bg-mint/50'}`}>{label}</button>)}
      </div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-ink/15 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 px-5 py-5 md:px-6">
        <h2 aria-live="polite" className="text-lg font-semibold first-letter:uppercase">{view === 'month' ? monthLabel.format(date) : `${shortDate.format(weekDays[0])} — ${shortDate.format(weekDays[6])} de ${weekDays[6].getFullYear()}`}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDate(new Date())} className={controlClass}>Hoje</button>
          <button type="button" aria-label={view === 'month' ? 'Mês anterior' : 'Semana anterior'} onClick={() => move(-1)} className={controlClass}>‹</button>
          <button type="button" aria-label={view === 'month' ? 'Próximo mês' : 'Próxima semana'} onClick={() => move(1)} className={controlClass}>›</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {view === 'month' ? <div className="min-w-[300px]">
          <div className="grid grid-cols-7 border-b border-ink/10 bg-paper/60">{weekdays.map(day => <div key={day} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-ink/60">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {monthDays.map(day => <div key={day.toISOString()} aria-label={fullDate.format(day)} aria-current={sameDay(day, today) ? 'date' : undefined} className={`min-h-16 border-b border-r border-ink/10 p-2 last:border-r-0 md:min-h-24 ${day.getMonth() !== date.getMonth() ? 'bg-paper/70 text-ink/35' : 'text-ink'}`}>
              {onSelectDate ? <button type="button" disabled={day < new Date(today.getFullYear(), today.getMonth(), today.getDate())} aria-pressed={selectedDate ? sameDay(day, selectedDate) : false} aria-label={fullDate.format(day)} onClick={() => onSelectDate(day)} className={`rounded-full hover:bg-mint disabled:opacity-30 ${selectedDate && sameDay(day, selectedDate) ? 'ring-2 ring-pine' : ''}`}><DayNumber date={day} today={today} /></button> : <DayNumber date={day} today={today} />}
              {eventButton && eventsFor(day).map(eventButton)}
            </div>)}
          </div>
        </div> : <div className="min-w-[720px]">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-ink/10 bg-white">
            <div />
            {weekDays.map((day, index) => <div key={index} aria-label={fullDate.format(day)} aria-current={sameDay(day, today) ? 'date' : undefined} className="border-l border-ink/10 py-3 text-center">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/60">{weekdays[index]}</p>
              {onSelectDate ? <button type="button" disabled={day < new Date(today.getFullYear(), today.getMonth(), today.getDate())} aria-pressed={selectedDate ? sameDay(day, selectedDate) : false} aria-label={fullDate.format(day)} onClick={() => onSelectDate(day)} className={`rounded-full hover:bg-mint disabled:opacity-30 ${selectedDate && sameDay(day, selectedDate) ? 'ring-2 ring-pine' : ''}`}><DayNumber date={day} today={today} /></button> : <DayNumber date={day} today={today} />}
              {eventButton && eventsFor(day).map(eventButton)}
            </div>)}
          </div>
          <div className="max-h-[620px] overflow-y-auto" tabIndex={0} aria-label="Horários da semana">
            {Array.from({ length: 24 }, (_, hour) => <div key={hour} className="grid min-h-16 grid-cols-[56px_repeat(7,minmax(0,1fr))]">
              <div className="pr-2 pt-1 text-right text-xs tabular-nums text-ink/50">{String(hour).padStart(2, '0')}:00</div>
              {weekDays.map((day, index) => <div key={index} aria-label={`${fullDate.format(day)}, ${hour} horas`} className={`border-b border-l border-ink/10 ${sameDay(day, today) ? 'bg-mint/15' : ''}`}>{eventButton && eventsFor(day, hour).map(eventButton)}</div>)}
            </div>)}
          </div>
        </div>}
      </div>
      {!onSelectDate && !appointments.some(item => {
        const start = new Date(item.inicio)
        return view === 'month' ? start.getMonth() === date.getMonth() && start.getFullYear() === date.getFullYear() : weekDays.some(day => sameDay(day, start))
      }) && <p className="border-t border-ink/10 px-5 py-4 text-sm text-ink/55">Nenhuma consulta neste período.</p>}
    </div>
  </section>
}

