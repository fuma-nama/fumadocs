'use client';

import type { SelectProps } from '@radix-ui/react-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { I18nProvider, useI18n, type Translations } from './contexts/i18n';

export type LanguageSelectProps = Omit<
  SelectProps,
  'value' | 'onValueChange'
> & {
  languages: { name: string; locale: string }[];
};

export function LanguageSelect({
  languages,
  ...props
}: LanguageSelectProps): JSX.Element {
  const context = useI18n();

  return (
    <Select value={context.locale} onValueChange={context.onChange} {...props}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.locale} value={lang.locale}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { I18nProvider, type Translations };
