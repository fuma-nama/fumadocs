import { visit as original } from 'unist-util-visit'

type SimpleVisit = {
  <R, T>(node: R, callback: (v: T) => void): void | 'skip'
  <R, T>(node: R, check: string[], callback: (v: T) => void): void | 'skip'
}

/**
 * The default type binding is too complicated, it slows the whole Typescript language server
 */
export const visit: SimpleVisit = original as unknown as SimpleVisit
