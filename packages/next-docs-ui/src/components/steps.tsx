import type { ReactNode } from 'react'

export function Steps({ children }: { children: ReactNode }) {
  return (
    <div className="nd-relative nd-border-l nd-ml-4 nd-pl-7 [counter-reset:step]">
      {children}
    </div>
  )
}

export function Step({ children }: { children: ReactNode }) {
  return (
    <div className="before:nd-absolute before:-nd-left-4 before:nd-w-8 before:nd-h-8 before:nd-flex before:nd-items-center before:nd-justify-center before:nd-rounded-full before:nd-content-[counter(step)] before:[counter-increment:step] before:nd-text-sm before:nd-text-secondary-foreground before:nd-bg-secondary">
      {children}
    </div>
  )
}
