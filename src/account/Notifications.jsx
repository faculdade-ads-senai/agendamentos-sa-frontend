import React, { useEffect, useState } from 'react'
import { listNotifications, readNotification } from '../api.jsx'
import { Feedback, secondaryClass } from '../components/Form.jsx'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    listNotifications(unread).then(result => { if (active) setItems(result) })
      .catch(problem => { if (active) setError(problem.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [unread, refresh])
  async function mark(id) {
    setBusy(id); setError('')
    try { await readNotification(id); setRefresh(value => value + 1) }
    catch (problem) { setError(problem.message) }
    finally { setBusy(null) }
  }
  return <section>
    <label className="my-6 flex items-center gap-3 text-sm"><input type="checkbox" checked={unread} onChange={event => setUnread(event.target.checked)} />Somente não lidas</label>
    <Feedback error={error} />
    {loading ? <p role="status">Carregando notificações…</p> : <ul className="grid gap-4">
      {items.map(item => <li key={item.id} className="rounded-2xl border border-ink/15 bg-white p-6">
        <p className={item.lidaEm ? 'text-ink/65' : 'font-semibold'}>{item.mensagem}</p>
        <p className="my-3 text-xs text-ink/60">{new Date(item.criadaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
        {!item.lidaEm && <button disabled={busy !== null} className={secondaryClass} onClick={() => mark(item.id)}>{busy === item.id ? 'Salvando…' : 'Marcar como lida'}</button>}
      </li>)}
      {!items.length && <li className="rounded-xl border border-ink/15 p-6 text-sm">Nenhuma notificação.</li>}
    </ul>}
  </section>
}



