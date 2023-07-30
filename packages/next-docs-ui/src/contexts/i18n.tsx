import { createContext } from 'react'

export const I18nContext = createContext<
  | {
      locale: string
      onChange: (v: string) => void
    }
  | undefined
>(undefined)
