import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

export function Wrapper(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'bg-gradient-to-b rounded-xl p-4 from-primary to-primary/10 [&>*]:my-0',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}
