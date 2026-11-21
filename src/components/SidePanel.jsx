import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function SidePanel({ title, children, onClose, id }) {
  const dialog = useRef(null)
  const headingId = useId()
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current.showModal()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  return createPortal(
    <dialog ref={dialog} id={id} aria-labelledby={headingId}
      onCancel={event => { event.preventDefault(); close.current() }}
      onClick={event => { if (event.target === event.currentTarget) close.current() }}
      className="side-panel fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md border-0 bg-transparent p-0 text-ink outline-none backdrop:bg-ink/40 backdrop:backdrop-blur-sm">
      <aside className="flex h-full flex-col bg-paper shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/15 px-6 py-5">
          <h2 id={headingId} className="font-serif text-3xl">{title}</h2>
          <button autoFocus type="button" onClick={onClose} aria-label="Fechar caixa de entrada" className="rounded-xl px-3 py-1 text-2xl hover:bg-ink/10 focus-visible:outline-pine">×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </aside>
    </dialog>,
    document.body,
  )
}

