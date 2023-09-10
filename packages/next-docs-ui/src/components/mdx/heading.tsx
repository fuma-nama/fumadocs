import clsx from 'clsx'
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
    <As {...props} className={clsx('nd-group nd-scroll-m-20', props.className)}>
      {props.children}
      <a
        href={`#${props.id}`}
        aria-label="Link to section"
        className="nd-not-prose nd-opacity-0 nd-font-normal nd-ml-2 nd-transition-opacity nd-text-muted-foreground group-hover:nd-opacity-100"
      >
        #
      </a>
    </As>
  )
}
