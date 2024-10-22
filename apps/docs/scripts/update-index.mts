import algosearch from 'algoliasearch';
import { DocumentRecord, sync } from 'fumadocs-core/search/algolia';
import * as fs from 'node:fs/promises';

export async function updateSearchIndexes(): Promise<void> {
  const content = await fs.readFile('./out/static.json');
  const records = JSON.parse(content.toString()) as DocumentRecord[];

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
    documents: records,
  });

  console.log('search updated');
}
