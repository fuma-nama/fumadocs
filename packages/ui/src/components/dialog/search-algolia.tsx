'use client';

import type { SearchIndex } from 'algoliasearch/lite';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { type ReactNode, useState } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import type { SearchOptions } from '@algolia/client-search';
import {
  SearchDialog,
  type SharedProps,
  type TagItem,
  TagsList,
} from './search';

export interface AlgoliaSearchDialogProps extends SharedProps {
  index: SearchIndex;
  searchOptions?: SearchOptions;
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
  const { search, setSearch, query } = useDocsSearch(
    {
      type: 'algolia',
      index,
      ...searchOptions,
    },
    undefined,
    tag,
  );

  useOnChange(defaultTag, (v) => {
    setTag(v);
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      isLoading={query.isLoading}
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
