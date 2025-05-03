'use client';

import algo from 'algoliasearch/lite';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import SearchDialog from 'fumadocs-ui/components/dialog/search-algolia';

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX;

if (!appId || !apiKey || !indexName) throw new Error('Algolia credentials');

const client = algo(appId, apiKey);

const index = client.initIndex(indexName);

export default function CustomSearchDialog(props: SharedProps) {
  return <SearchDialog index={index} {...props} showAlgolia />;
}
