import { type ReactNode } from 'react';
import type { I18nConfig } from 'fumadocs-core/i18n';
interface LocaleItem {
  name: string;
  locale: string;
}
interface LocaleContextType {
  locale?: string;
  onChange?: (v: string) => void;
  locales?: LocaleItem[];
}
export declare function useI18n(): LocaleContextType;
export interface I18nProviderProps extends Partial<
  Pick<I18nConfig, 'defaultLanguage' | 'hideLocale'>
> {
  locale?: string;
  onLocaleChange?: (v: string) => void;
  translations?: Partial<Record<string, string>>;
  locales?: LocaleItem[];
  children?: ReactNode;
}
export declare function I18nProvider({
  locales,
  locale,
  defaultLanguage,
  hideLocale,
  onLocaleChange,
  children,
  translations,
}: I18nProviderProps): import('react').JSX.Element;
export {};
//# sourceMappingURL=i18n.d.ts.map
