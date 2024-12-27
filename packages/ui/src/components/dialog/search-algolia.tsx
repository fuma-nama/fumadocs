'use client';

import {
  useDocsSearch,
  type AlgoliaOptions,
} from 'fumadocs-core/search/client';
import { type ReactNode, useState } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import {
  SearchDialog,
  type SharedProps,
  TagsList,
  type TagItem,
} from './search';

export interface AlgoliaSearchDialogProps extends SharedProps {
  index: AlgoliaOptions['index'];
  searchOptions?: Omit<AlgoliaOptions, 'index'>;
  footer?: ReactNode;

  defaultTag?: string;
  tags?: TagItem[];

  /**
   * Add the "Powered by Algolia" label, this is useful for free tier users
   *
   * @defaultValue false
   */
  showAlgolia?: boolean;

  /**
   * Allow to clear tag filters
   *
   * @defaultValue false
   */
  allowClear?: boolean;
}

export default function AlgoliaSearchDialog({
  index,
  searchOptions,
  tags,
  defaultTag,
  showAlgolia = false,
  allowClear = false,
  ...props
}: AlgoliaSearchDialogProps): ReactNode {
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
            <TagsList
              tag={tag}
              onTagChange={setTag}
              items={tags}
              allowClear={allowClear}
            >
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

function AlgoliaTitle(): ReactNode {
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
