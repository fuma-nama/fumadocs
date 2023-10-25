import { cn } from '@/utils/cn'
import { SafeLink, type SafeLinkProps } from 'next-docs-zeta/link'
import type { HTMLAttributes, ReactNode } from 'react'

export function Cards(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'nd-grid nd-grid-cols-1 nd-gap-4 md:nd-grid-cols-2',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}

export type CardProps = {
  icon?: ReactNode
  title: string
  description: string
} & Omit<SafeLinkProps, 'title' | 'description'>

export function Card({ icon, title, description, ...props }: CardProps) {
  return (
    <SafeLink
      {...props}
      className={cn(
        'nd-block nd-not-prose nd-text-sm nd-rounded-lg nd-p-4 nd-border nd-bg-card nd-text-card-foreground nd-transition-colors hover:nd-bg-muted/80',
        props.className
      )}
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
