import { createContext, useContext } from 'react';

export interface Translations {
  search: string;
  searchNoResult: string;
  light: string;
  dark: string;
  toc: string;
  system: string;
  lastUpdate: string;
}

export interface I18nContextType {
  locale?: string;
  onChange?: (v: string) => void;
  text: Partial<Translations>;
}

const I18nContext = createContext<I18nContextType>({ text: {} });

export const I18nProvider = I18nContext.Provider;

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}
