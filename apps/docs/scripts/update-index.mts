import algosearch from 'algoliasearch';
import { sync } from 'fumadocs-core/search-algolia/server';
import type { Manifest } from 'fumadocs-mdx';
import { createGetUrl, getSlugs, parseFilePath } from 'fumadocs-core/source';
import path from 'node:path';

export async function updateSearchIndexes(manifest: Manifest): Promise<void> {
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

  const getUrl = createGetUrl('/docs');

  await sync(client, {
    document: process.env.NEXT_PUBLIC_ALGOLIA_INDEX ?? 'document',
    documents: manifest.files
      .filter((file) => file.collection === 'docs')
      .map((docs) => {
        const url = getUrl(
          getSlugs(parseFilePath(path.relative('content/docs', docs.path))),
        );

        if (!docs.data.structuredData)
          throw new Error('`structuredData` is required');

        return {
          _id: docs.path,
          title: docs.data.frontmatter.title as string,
          description: docs.data.frontmatter.description as string,
          url,
          structured: docs.data.structuredData,
          tag: url.split('/')[2],
        };
      }),
  });

  console.log('search updated');
}
