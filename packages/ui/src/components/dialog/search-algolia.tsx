'use client';

import type { SearchIndex } from 'algoliasearch/lite';
import {
  type Options,
  useAlgoliaSearch,
} from 'fumadocs-core/search-algolia/client';
import { type ReactNode, useState } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import {
  SearchDialog,
  type SharedProps,
  type TagItem,
  TagsList,
} from './search';

export interface AlgoliaSearchDialogProps extends SharedProps {
  index: SearchIndex;
  searchOptions?: Options;
  footer?: ReactNode;

  defaultTag?: string;
  tags?: TagItem[];

  /**
   * Add the "Powered by Algolia" label, this is useful for free tier users
   *
   * @defaultValue false
   */
  showAlgolia?: boolean;
}

export default function AlgoliaSearchDialog({
  index,
  searchOptions,
  tags,
  defaultTag,
  showAlgolia = false,
  ...props
}: AlgoliaSearchDialogProps): React.ReactElement {
  const [tag, setTag] = useState(defaultTag);
  let filters = searchOptions?.filters;

  if (tag) {
    filters = filters ? `tag:${tag} AND (${filters})` : `tag:${tag}`;
  }

  const { search, setSearch, query } = useAlgoliaSearch(index, {
    ...searchOptions,
    filters,
  });

  useOnChange(defaultTag, (v) => {
    setTag(v);
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      {...props}
      footer={
        tags ? (
          <>
            <TagsList tag={tag} onTagChange={setTag} items={tags}>
              {showAlgolia ? <AlgoliaTitle /> : null}
            </TagsList>
            {props.footer}
          </>
        ) : (
          props.footer
        )
      }
    />
  );
}

function AlgoliaTitle(): React.ReactNode {
  return (
    <a
      href="https://algolia.com"
      rel="noreferrer noopener"
      className="ms-auto text-xs text-fd-muted-foreground"
    >
      Search powered by Algolia
    </a>
  );
}
