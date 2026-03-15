'use client';
import { defaultTranslations, type Translations } from '@/i18n';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

export function useTranslations(): Translations {
  return (useI18n().text.openapi ?? defaultTranslations) as unknown as Translations;
}

export interface OpenAPII18nLabelProps {
  label: keyof Translations;
  /** Replace {key} placeholders in the translation string */
  replacements?: Record<string, string>;
}

/**
 * Renders a translated string. Use in server components so the label is resolved on the client from the current locale.
 */
export function I18nLabel({ label, replacements = {} }: OpenAPII18nLabelProps): string {
  const text = useTranslations();
  let value = text[label];
  for (const [k, v] of Object.entries(replacements)) {
    value = value.replaceAll(`{${k}}`, v);
  }
  return value;
}
