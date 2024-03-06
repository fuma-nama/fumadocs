'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import { SearchDialogContent, SearchDialog, type SharedProps } from './search';

export type DefaultSearchDialogProps = SharedProps & ContentProps;

export default function DefaultSearchDialog({
  tag,
  api,
  footer,
  ...props
}: DefaultSearchDialogProps): JSX.Element {
  return (
    <SearchDialog {...props}>
      <Content tag={tag} footer={footer} api={api} />
    </SearchDialog>
  );
}

interface ContentProps {
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

function Content({ tag, footer, api }: ContentProps): JSX.Element {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch(locale, tag, api);

  return (
    <SearchDialogContent
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      footer={footer}
    />
  );
}
