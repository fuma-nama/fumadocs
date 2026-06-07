import translationKeys from '@/.translations/keys.json';
import type { TranslationExtension } from 'fumadocs-core/i18n';
import type { Translations } from '@/.translations';

export type { Translations };
export function storyTranslations(): TranslationExtension<keyof Translations> {
  return { keys: translationKeys as never };
}
