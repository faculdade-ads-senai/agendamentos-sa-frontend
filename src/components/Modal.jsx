import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Overlay from './Overlay.jsx'

export default function Modal({ title, children, onClose }) {
  const titleId = useId()
  const panel = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current.focus()
    function keydown(event) {
      if (event.key === 'Escape') close.current()
      if (event.key !== 'Tab') return
      const controls = panel.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  return createPortal(<Overlay onClose={onClose}>
    <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 text-ink shadow-xl outline-none md:p-8">
      <div className="mb-6 flex items-start justify-between gap-5">
        <h2 id={titleId} className="font-serif text-3xl">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar modal" className="rounded-lg px-3 py-1 text-2xl hover:bg-ink/10">×</button>
      </div>
      {children}
    </section>
  </Overlay>, document.body)
}

