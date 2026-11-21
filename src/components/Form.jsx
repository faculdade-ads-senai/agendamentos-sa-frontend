import React from 'react'

export const fieldClass = 'w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm focus:outline-pine'
export const buttonClass = 'rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-ink disabled:opacity-40'
export const secondaryClass = 'rounded-xl border border-ink/20 px-4 py-2 text-sm hover:bg-mint disabled:opacity-40'

export function Feedback({ error, notice }) {
  return <>{error && <p role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="my-4 rounded-xl bg-mint p-4 text-sm text-pine">{notice}</p>}</>
}

export function Field({ label, ...props }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input className={fieldClass} {...props} /></label>
}
