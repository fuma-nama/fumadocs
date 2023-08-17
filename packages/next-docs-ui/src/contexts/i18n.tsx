import { createContext } from 'react'

export const I18nContext = createContext<
  | {
      locale: string
      onChange: (v: string) => void
      text?: Partial<{
        search: string
        light: string
        dark: string
        system: string
      }>
    }
  | undefined
>(undefined)
