import { type OramaDocument, sync } from 'fumadocs-core/search/orama-cloud';
import fs from 'node:fs/promises';
import { DataSourceId, isAdmin, orama } from '../lib/orama/client.ts';

export async function updateSearchIndexes(): Promise<void> {
  if (!isAdmin) {
    console.log('no private API key for Orama found, skipping');
    return;
  }

  // Next.js writes it under `route-cache` when built with an adapter, like on Vercel
  const [file] = await Array.fromAsync(
    fs.glob('.next/server/{app,route-cache/*/*/$}/static.json.body'),
  );
  const records = JSON.parse(await fs.readFile(file, 'utf-8')) as OramaDocument[];

  await sync(orama, {
    index: DataSourceId,
    documents: records,
  });

  console.log(`search updated: ${records.length} records`);
}
