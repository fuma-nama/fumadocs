'use client'

import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { Circle } from 'lucide-react'
import { useState, type ReactNode } from 'react'

const itemVariants = cva(
  'inline-flex items-center gap-2 text-muted-foreground bg-secondary text-sm font-medium px-4 py-2 rounded-md',
  {
    variants: {
      active: {
        true: 'text-secondary-foreground'
      }
    }
  }
)

export function ThemeSwitch(props: { children: ReactNode; style: string }) {
  const [active, setActive] = useState(false)

  return (
    <div className="flex flex-row gap-3 flex-wrap">
      <button
        className={cn(itemVariants({ active }))}
        onClick={() => setActive(prev => !prev)}
      >
        <Circle className={cn('w-4 h-4', active && 'fill-primary')} />
        {props.children}
      </button>
      {active && <style>{props.style}</style>}
    </div>
  )
}
