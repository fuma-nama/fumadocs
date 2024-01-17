'use client';

import { useDocsSearch } from 'next-docs-zeta/search/client';
import { type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import { SearchDialogContent, SearchDialog, type SharedProps } from './search';

export type DefaultSearchDialogProps = SharedProps & ContentProps;

export default function DefaultSearchDialog({
  tag,
  footer,
  ...props
}: DefaultSearchDialogProps): JSX.Element {
  return (
    <SearchDialog {...props}>
      <Content tag={tag} footer={footer} />
    </SearchDialog>
  );
}

interface ContentProps {
  /**
   * Search tag
   */
  tag?: string;

  footer?: ReactNode;
}

function Content({ tag, footer }: ContentProps): JSX.Element {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch(locale, tag);

  return (
    <SearchDialogContent
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      footer={footer}
    />
  );
}
