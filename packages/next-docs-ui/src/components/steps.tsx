import type { ReactNode } from 'react'

export function Steps({ children }: { children: ReactNode }) {
  return <div className="nd-steps">{children}</div>
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="nd-step">{children}</div>
}
