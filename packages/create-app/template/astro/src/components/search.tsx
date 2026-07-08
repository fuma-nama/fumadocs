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
  am: 'armenian',
  bg: 'bulgarian',
  cz: 'czech',
  dk: 'danish',
  nl: 'dutch',
  en: 'english',
  fi: 'finnish',
  fr: 'french',
  de: 'german',
  gr: 'greek',
  hu: 'hungarian',
  in: 'indian',
  id: 'indonesian',
  ie: 'irish',
  it: 'italian',
  lt: 'lithuanian',
  np: 'nepali',
  no: 'norwegian',
  pt: 'portuguese',
  ro: 'romanian',
  ru: 'russian',
  rs: 'serbian',
  es: 'spanish',
  se: 'swedish',
  ta: 'tamil',
  tr: 'turkish',
  uk: 'ukrainian',
  vi: 'vietnamese',
  sk: 'sanskrit',
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
