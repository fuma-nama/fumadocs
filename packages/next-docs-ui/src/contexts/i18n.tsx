import { createContext } from 'react'

export type Translations = {
  search: string
  searchNoResult: string
  light: string
  dark: string
  toc: string
  system: string
  lastUpdate: string
}

export const I18nContext = createContext<{
  locale?: string
  onChange: (v: string) => void
  text?: Partial<Translations>
}>({
  onChange: () => {}
})
