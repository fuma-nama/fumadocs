'use client';
import { createContext, useContext } from 'react';

export interface Translations {
  search: string;
  searchNoResult: string;

  toc: string;
  tocNoHeadings: string;

  lastUpdate: string;
  chooseLanguage: string;
  nextPage: string;
  previousPage: string;
  chooseTheme: string;
  editOnGithub: string;
}

export interface LocaleItem {
  name: string;
  locale: string;
}

interface I18nContextType {
  locale?: string;
  onChange?: (v: string) => void;
  text: Translations;
  locales?: LocaleItem[];
}

export const defaultTranslations: Translations = {
  search: 'Search',
  searchNoResult: 'No results found',
  toc: 'On this page',
  tocNoHeadings: 'No Headings',
  lastUpdate: 'Last updated on',
  chooseLanguage: 'Choose a language',
  nextPage: 'Next',
  previousPage: 'Previous',
  chooseTheme: 'Theme',
  editOnGithub: 'Edit on GitHub',
};

export const I18nContext = createContext<I18nContextType>({
  text: defaultTranslations,
});

export function I18nLabel(props: { label: keyof Translations }): string {
  const { text } = useI18n();

  return text[props.label];
}

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}
