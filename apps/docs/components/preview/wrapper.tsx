import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

export function Wrapper(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-xl p-4 bg-gradient-to-br from-blue-300 to-purple-400',
        props.className
      )}
    >
      {props.children}
    </div>
  )
}
