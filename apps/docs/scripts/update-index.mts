import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import env from '@next/env';
import algosearch from 'algoliasearch';
import { sync } from '@maximai/fumadocs-core/search-algolia/server';
import type { SearchIndex } from 'fumadocs-mdx';

env.loadEnvConfig(process.cwd());

const indexes = JSON.parse(
  readFileSync(
    resolve('./.next/server/chunks/fumadocs_search.json'),
  ).toString(),
) as SearchIndex[];

const client = algosearch(
  process.env.ALGOLIA_APP_ID || '',
  process.env.ALGOLIA_API_KEY || '',
);

void sync(client, {
  document: process.env.NEXT_PUBLIC_ALGOLIA_INDEX,
  documents: indexes.map((docs) => ({
    _id: docs.id,
    title: docs.title,
    url: docs.url,
    structured: docs.structuredData,
    extra_data: {
      tag: docs.url.split('/')[2],
    },
  })),
}).then(() => {
  console.log('search updated');
});
