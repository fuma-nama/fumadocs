import { SafeLink } from 'next-docs-zeta/link'
import type { ReactNode } from 'react'

export function Cards({ children }: { children: ReactNode }) {
  return (
    <div className="nd-grid nd-grid-cols-1 md:nd-grid-cols-2 nd-gap-4 nd-not-prose">
      {children}
    </div>
  )
}

export function Card({
  href,
  icon,
  title,
  description
}: {
  href: string
  icon?: ReactNode
  title: string
  description: string
}) {
  return (
    <SafeLink
      href={href}
      className="nd-text-sm nd-rounded-lg nd-p-4 nd-border nd-bg-card nd-text-card-foreground nd-transition-colors hover:nd-bg-muted/50"
    >
      {icon && (
        <div className="nd-w-fit nd-border nd-p-1 nd-rounded-md nd-bg-background nd-mb-3">
          <div className="[&_svg]:nd-w-4 [&_svg]:nd-h-4 nd-bg-muted nd-p-2 nd-rounded-md nd-text-muted-foreground">
            {icon}
          </div>
        </div>
      )}
      <h3 className="nd-font-medium nd-mb-1">{title}</h3>
      <p className="nd-text-muted-foreground">{description}</p>
    </SafeLink>
  )
}
