import { createContext } from 'react'

export type Translations = {
  search: string
  light: string
  dark: string
  toc: string
  system: string
}

export const I18nContext = createContext<
  | {
      locale: string
      onChange: (v: string) => void
      text?: Partial<Translations>
    }
  | undefined
>(undefined)
