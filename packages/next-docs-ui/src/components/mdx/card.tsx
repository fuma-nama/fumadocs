import { cn } from '@/utils/cn'
import Link, { type LinkProps } from 'next-docs-zeta/link'
import type { HTMLAttributes, ReactNode } from 'react'

export function Cards(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'nd-grid nd-grid-cols-1 nd-gap-4 sm:nd-grid-cols-2',
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
} & Omit<LinkProps, 'title'>

export function Card({ icon, title, description, ...props }: CardProps) {
  return (
    <Link
      {...props}
      className={cn(
        'nd-block nd-not-prose nd-text-sm nd-rounded-lg nd-p-4 nd-border nd-shadow-md nd-bg-card nd-text-card-foreground nd-transition-colors hover:nd-bg-muted/80',
        props.className
      )}
    >
      {icon && (
        <div className="nd-w-fit [&_svg]:nd-w-4 [&_svg]:nd-h-4 nd-bg-muted nd-border nd-p-2 nd-rounded-md nd-text-muted-foreground nd-mb-2">
          {icon}
        </div>
      )}
      <h3 className="nd-font-medium nd-mb-1">{title}</h3>
      <p className="nd-text-muted-foreground">{description}</p>
    </Link>
  )
}
