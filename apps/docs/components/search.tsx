'use client';

import { liteClient } from 'algoliasearch/lite';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import SearchDialog from 'fumadocs-ui/components/dialog/search-algolia';
import { modes } from '@/utils/modes';
import { useMode } from '@/app/layout.client';

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX;

if (!appId || !apiKey) throw new Error('Algolia credentials');
const client = liteClient(appId, apiKey);

export default function CustomSearchDialog(
  props: SharedProps,
): React.ReactElement {
  if (!indexName) throw new Error('Algolia credentials');

  return (
    <SearchDialog
      client={client}
      searchOptions={{
        indexName,
      }}
      {...props}
      defaultTag={useMode() ?? 'headless'}
      tags={modes.map((mode) => ({
        name: mode.name,
        value: mode.param,
      }))}
      showAlgolia
    />
  );
}
