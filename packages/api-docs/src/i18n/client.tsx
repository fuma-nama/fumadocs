'use client';
import { defaultTranslations, type Translations } from '@/i18n';
import { renderTranslation, TranslationValue } from 'fumadocs-core/i18n';
import { useTranslations as useTranslationsBase } from 'fumadocs-ui/contexts/i18n';
import { createContext, ReactNode, use } from 'react';

const NamespaceContext = createContext('api:shared');

export function useTranslations() {
  return useTranslationsBase<Translations>(use(NamespaceContext)) ?? defaultTranslations;
}

/**
 * Renders a translated string. Use in server components so the label is resolved on the client from the current locale.
 */
export function I18nLabel<K extends keyof Translations>({
  label,
  replacements,
}: {
  label: K;
  replacements?: Translations[K] extends TranslationValue<infer Params>
    ? Record<Params, string>
    : never;
}): string {
  const text = useTranslations();
  return renderTranslation(text[label], replacements!);
}

export function TranslationsProvider({
  children,
  namespace,
}: {
  namespace: string;
  children: ReactNode;
}) {
  return <NamespaceContext value={namespace}>{children}</NamespaceContext>;
}
