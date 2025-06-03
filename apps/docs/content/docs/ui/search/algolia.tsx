'use client';

import { liteClient } from 'algoliasearch/lite';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import SearchDialog from 'fumadocs-ui/components/dialog/search-algolia';

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!;

if (!appId || !apiKey) throw new Error('Missing Algolia credentials');

const client = liteClient(appId, apiKey);

export default function CustomSearchDialog(props: SharedProps) {
  return (
    <SearchDialog
      searchOptions={{
        client,
        indexName: 'document',
      }}
      {...props}
      showAlgolia
    />
  );
}
