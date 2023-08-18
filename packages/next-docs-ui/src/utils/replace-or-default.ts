import type { ReactNode } from 'react'

export type ReplaceOrDisable = ReactNode | true | false | undefined

/**
 * If `replace` is false, return nothing.
 * If `replace` is null, return `default`
 * Otherwise, return `replace`
 */
export function replaceOrDefault(
  replace: ReplaceOrDisable,
  def: ReactNode
): ReactNode {
  if (replace === false) return
  if (replace == null) return def

  return def
}
