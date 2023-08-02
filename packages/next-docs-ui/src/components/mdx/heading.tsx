import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

type Types = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type HeadingProps<T extends Types> = Omit<ComponentPropsWithoutRef<T>, 'as'> & {
  as?: T
}

export function Heading<T extends Types = 'h1'>({
  id,
  as,
  ...props
}: HeadingProps<T>) {
  const As = as ?? 'h1'

  return (
    <As {...props} className={clsx('nd-group', props.className)}>
      <span id={id} className="nd-absolute -nd-mt-20" />
      {props.children}
      <div className="nd-not-prose nd-opacity-0 nd-inline nd-font-normal nd-ml-2 nd-transition-opacity nd-text-muted-foreground group-hover:nd-opacity-100">
        <a href={`#${id}`} aria-label="Link to section">
          #
        </a>
      </div>
    </As>
  )
}
