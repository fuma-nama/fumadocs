import type { ComponentPropsWithoutRef, ElementType } from 'react'

export type WithAs<T extends ElementType, Extend = object> = Omit<
  ComponentPropsWithoutRef<T>,
  'as' | keyof Extend
> &
  Extend & {
    as?: T
  }
