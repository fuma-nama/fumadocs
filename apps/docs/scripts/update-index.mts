import algosearch from 'algoliasearch';
import { sync } from 'fumadocs-core/search-algolia/server';
import type { SearchIndex } from 'fumadocs-mdx';

export async function updateSearchIndexes(
  indexes: SearchIndex[],
): Promise<void> {
  if (!process.env.ALGOLIA_API_KEY) {
    console.warn('Algolia API Key not found, skip updating search index.');
    return;
  }

  if (!process.env.NEXT_PUBLIC_ALGOLIA_APP_ID) {
    console.warn('Algolia App ID not found, skip updating search index.');
    return;
  }

  const client = algosearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    process.env.ALGOLIA_API_KEY,
    {
      timeouts: {
        connect: 60,
        read: 180,
        write: 180,
      },
    },
  );

  await sync(client, {
    document: process.env.NEXT_PUBLIC_ALGOLIA_INDEX ?? 'document',
    documents: indexes.map((docs) => ({
      _id: docs.id,
      title: docs.title,
      url: docs.url,
      structured: docs.structuredData,
      tag: docs.url.split('/')[2],
    })),
  });

  console.log('search updated');
}
