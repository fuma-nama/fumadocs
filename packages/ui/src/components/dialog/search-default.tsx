'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import { SearchDialog, type SharedProps } from './search';

export interface DefaultSearchDialogProps extends SharedProps {
  /**
   * Search tag
   */
  tag?: string;

  /**
   * Search API URL
   */
  api?: string;

  /**
   * The debounced delay for performing a search.
   */
  delayMs?: number;

  footer?: ReactNode;
}

export default function DefaultSearchDialog({
  tag,
  api,
  delayMs,
  ...props
}: DefaultSearchDialogProps): React.ReactElement {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch(locale, tag, api, delayMs);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      {...props}
    />
  );
}
