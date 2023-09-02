import type { ReactNode } from 'react'

export function replaceOrDefault(
  obj:
    | {
        enabled?: boolean
        component?: ReactNode
      }
    | undefined,
  def: ReactNode
): ReactNode {
  if (obj?.enabled === false) return
  if (obj?.component != null) return obj.component

  return def
}
