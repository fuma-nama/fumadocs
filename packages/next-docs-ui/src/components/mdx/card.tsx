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
        'block not-prose text-sm rounded-lg p-4 border shadow-md bg-card text-card-foreground transition-colors hover:bg-muted/80',
        props.className
      )}
    >
      {icon && (
        <div className="w-fit [&_svg]:w-4 [&_svg]:h-4 bg-muted border p-2 rounded-md text-muted-foreground mb-2">
          {icon}
        </div>
      )}
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </Link>
  )
}
