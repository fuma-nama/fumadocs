import { cn } from '@/utils/cn'
import Link, { type LinkProps } from 'next-docs-zeta/link'
import type { HTMLAttributes, ReactNode } from 'react'

export function Cards(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', props.className)}
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
        'not-prose bg-card text-card-foreground hover:bg-muted/80 block rounded-lg border p-4 text-sm shadow-md transition-colors',
        props.className
      )}
    >
      {icon && (
        <div className="bg-muted text-muted-foreground mb-2 w-fit rounded-md border p-2 [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </div>
      )}
      <h3 className="mb-1 font-medium">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </Link>
  )
}
