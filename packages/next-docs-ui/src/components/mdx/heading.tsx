import { cn } from '@/utils/cn'
import { LinkIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

type Types = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type HeadingProps<T extends Types> = Omit<ComponentPropsWithoutRef<T>, 'as'> & {
  as?: T
}

export function Heading<T extends Types = 'h1'>({
  as,
  ...props
}: HeadingProps<T>) {
  const As = as ?? 'h1'

  return (
    <As {...props} className={cn('nd-scroll-m-20', props.className)}>
      <a href={`#${props.id}`} className="nd-group nd-not-prose">
        {props.children}
        <LinkIcon
          aria-label="Link to section"
          className="nd-inline nd-w-4 nd-h-4 nd-ml-2 nd-text-muted-foreground nd-opacity-0 nd-transition-opacity group-hover:nd-opacity-100"
        />
      </a>
    </As>
  )
}
