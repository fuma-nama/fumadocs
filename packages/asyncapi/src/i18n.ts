import translationKeys from '@/.translations/keys.json';
import type { TranslationExtension } from 'fumadocs-core/i18n';
import type { Translations as OwnTranslations } from '@/.translations';
import { type Translations as SharedTranslations, apiDocsTranslations } from 'shared-api/i18n';

export type Translations = OwnTranslations & SharedTranslations;
export function asyncapiTranslations(): TranslationExtension<keyof Translations> {
  const shared = apiDocsTranslations();
  return { keys: [...shared.keys, ...translationKeys] as never };
}
