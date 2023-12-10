import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

export function Wrapper(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'from-primary to-primary/10 rounded-xl bg-gradient-to-b p-4 [&>*]:my-0',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}
