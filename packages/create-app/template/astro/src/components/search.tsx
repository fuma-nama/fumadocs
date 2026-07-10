'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static';
import { create } from '@orama/orama';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

const oramaLanguageByLocale: Record<string, string | undefined> = {
  ar: 'arabic',
  hy: 'armenian',
  bg: 'bulgarian',
  cs: 'czech',
  da: 'danish',
  nl: 'dutch',
  en: 'english',
  fi: 'finnish',
  fr: 'french',
  de: 'german',
  el: 'greek',
  hu: 'hungarian',
  // Orama 3 names its Hindi stemmer `indian`.
  hi: 'indian',
  id: 'indonesian',
  ga: 'irish',
  it: 'italian',
  lt: 'lithuanian',
  ne: 'nepali',
  no: 'norwegian',
  pt: 'portuguese',
  ro: 'romanian',
  ru: 'russian',
  sr: 'serbian',
  sl: 'slovenian',
  es: 'spanish',
  sv: 'swedish',
  ta: 'tamil',
  tr: 'turkish',
  uk: 'ukrainian',
  sa: 'sanskrit',
};

function getOramaLanguage(locale?: string) {
  const code = locale?.toLowerCase().split(/[-_]/)[0];

  return code ? (oramaLanguageByLocale[code] ?? 'english') : 'english';
}

function initOrama(locale?: string) {
  return create({
    schema: { _: 'string' },
    // https://docs.orama.com/docs/orama-js/supported-languages
    language: getOramaLanguage(locale),
  });
}

export default function DefaultSearchDialog(props: SharedProps) {
  const { locale } = useI18n(); // (optional) for i18n
  const { search, setSearch, query } = useDocsSearch({
    client: oramaStaticClient({
      initOrama,
      locale,
    }),
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
