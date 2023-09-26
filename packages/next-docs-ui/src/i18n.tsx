'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { SelectProps } from '@radix-ui/react-select'
import { useContext } from 'react'
import { I18nContext, type Translations } from './contexts/i18n'

export type LanguageSelectProps = Omit<
  SelectProps,
  'value' | 'onValueChange'
> & {
  languages: { name: string; locale: string }[]
}

export function LanguageSelect({ languages, ...props }: LanguageSelectProps) {
  const context = useContext(I18nContext)

  return (
    <Select value={context.locale} onValueChange={context.onChange} {...props}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map(lang => (
          <SelectItem key={lang.locale} value={lang.locale}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const I18nProvider = I18nContext.Provider
export { Translations }
