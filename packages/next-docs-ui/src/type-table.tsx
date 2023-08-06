'use client'

import { InfoIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from './components/ui/popover'
import { cn } from './utils/cn'

export function Info({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger>
        <InfoIcon className="nd-w-4 nd-h-4" />
      </PopoverTrigger>
      <PopoverContent className="nd-text-sm">{children}</PopoverContent>
    </Popover>
  )
}

type ObjectType = {
  [name: string]: {
    description?: string
    type: string
    typeDescription?: string
    typeDescriptionLink?: string
    default?: string
  }
}

export function TypeTable({ type }: { type: ObjectType }) {
  const th = cn('nd-font-medium nd-p-2 first:nd-pl-0 last:nd-pr-0')
  const td = cn('nd-p-2 first:nd-pl-0 last:nd-pr-0')
  const field = cn('nd-inline-flex nd-flex-row nd-items-center nd-gap-1')
  const code = cn('nd-p-1 nd-rounded-md nd-bg-secondary')

  return (
    <div className="nd-whitespace-nowrap nd-overflow-auto nd-not-prose">
      <table className="nd-w-full nd-text-left nd-text-sm nd-text-muted-foreground nd-my-4">
        <thead className="nd-border-b">
          <tr>
            <th className={cn(th, 'nd-w-[45%]')}>Prop</th>
            <th className={cn(th, 'nd-w-[30%]')}>Type</th>
            <th className={cn(th, 'nd-w-[25%]')}>Default</th>
          </tr>
        </thead>
        <tbody className="nd-border-collapse nd-divide-y nd-divide-border">
          {Object.entries(type).map(([key, value]) => (
            <tr key={key}>
              <td className={td}>
                <div className={field}>
                  <code
                    className={cn(code, 'nd-bg-primary/10 nd-text-primary')}
                  >
                    {key}
                  </code>
                  {value.description && <Info>{value.description}</Info>}
                </div>
              </td>
              <td className={td}>
                <div className={field}>
                  <code className={code}>{value.type}</code>
                  {value.typeDescription && (
                    <Info>
                      <pre className="nd-overflow-auto nd-text-secondary-foreground nd-bg-secondary">
                        {value.typeDescription}
                      </pre>
                    </Info>
                  )}
                  {value.typeDescriptionLink && (
                    <Link href={value.typeDescriptionLink}>
                      <InfoIcon className="nd-w-4 nd-h-4" />
                    </Link>
                  )}
                </div>
              </td>
              <td className={td}>
                {value.default ? (
                  <code className={code}>{value.default}</code>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
