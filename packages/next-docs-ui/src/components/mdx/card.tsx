import { ExternalLinkIcon } from 'lucide-react'
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
  icon = <ExternalLinkIcon />,
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
      className="nd-text-sm nd-rounded-lg nd-p-4 nd-border nd-bg-card nd-text-card-foreground nd-transition-colors hover:nd-bg-accent hover:nd-shadow-sm"
    >
      <div className="nd-w-fit nd-border nd-p-1 nd-rounded-md nd-bg-background nd-mb-3">
        <div className="nd-flex nd-justify-center nd-items-center nd-w-8 nd-bg-secondary nd-p-2 nd-h-8 nd-rounded-md nd-text-muted-foreground">
          {icon}
        </div>
      </div>
      <h3 className="nd-font-medium nd-mb-1">{title}</h3>
      <p className="nd-text-muted-foreground">{description}</p>
    </SafeLink>
  )
}
