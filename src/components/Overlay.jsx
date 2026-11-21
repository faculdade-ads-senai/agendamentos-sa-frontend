import React from 'react'

export default function Overlay({ children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-5 backdrop-blur-sm" onClick={event => {
    if (event.target === event.currentTarget) onClose()
  }}>{children}</div>
}
