'use client';

import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import Mixedbread from '@mixedbread/sdk';

const client = new Mixedbread({
  apiKey: 'mxb_xxxx',
  baseURL: 'https://api.example.com', // Optional, defaults to https://api.mixedbread.com
});

/**
 * Render a search dialog connected to Mixedbread-powered document search.
 *
 * The dialog is bound to the search state provided by `useDocsSearch` and reflects
 * loading and result data from the Mixedbread client. It also uses the current
 * locale from `useI18n` for localized searches.
 *
 * @returns A React element that renders a search dialog bound to Mixedbread document search results
 */
export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n(); // (optional) for i18n
  const { search, setSearch, query } = useDocsSearch({
    type: 'mixedbread',
    client,
    storeIdentifier: 'your_store_identifier',
    locale,
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter>
          <a
            href="https://mixedbread.com"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by Mixedbread
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}