'use client';

import { useDocsSearch } from '@maximai/fumadocs-core/search/client';
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

  footer?: ReactNode;
}

export default function DefaultSearchDialog({
  tag,
  api,
  ...props
}: DefaultSearchDialogProps): React.ReactElement {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch(locale, tag, api);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      {...props}
    />
  );
}
