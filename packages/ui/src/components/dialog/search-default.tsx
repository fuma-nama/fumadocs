'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  SearchDialogContent,
  SearchDialog,
  type SharedProps,
  type SearchLink,
} from './search';

export type DefaultSearchDialogProps = SharedProps & ContentProps;

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
  links?: SearchLink[];
}

export default function DefaultSearchDialog({
  open,
  onOpenChange,
  ...props
}: DefaultSearchDialogProps): JSX.Element {
  return (
    <SearchDialog open={open} onOpenChange={onOpenChange}>
      <Content {...props} />
    </SearchDialog>
  );
}

function Content({ tag, api, ...props }: ContentProps): JSX.Element {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch(locale, tag, api);

  return (
    <SearchDialogContent
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      {...props}
    />
  );
}
