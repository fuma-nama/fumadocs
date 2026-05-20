'use client';

import { defaultTranslations, type Translations } from '@/i18n';
import { useTranslations as useTranslationsBase } from 'fumadocs-ui/contexts/i18n';

export function useTranslations() {
  return useTranslationsBase<Translations>('story') ?? defaultTranslations;
}
