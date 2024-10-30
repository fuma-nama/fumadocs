import { sync } from 'fumadocs-core/search/orama-cloud';
import * as fs from 'node:fs/promises';
import type { Static } from '@/app/static.json/route';
import { CloudManager } from '@oramacloud/client';

export async function updateSearchIndexes(): Promise<void> {
  const apiKey = process.env.ORAMA_PRIVATE_API_KEY;

  if (!apiKey) {
    console.log('no api key for Orama found, skipping');
    return;
  }

  const content = await fs.readFile('./out/static.json');
  const records = JSON.parse(content.toString()) as Static[];

  const manager = new CloudManager({ api_key: apiKey });

  await sync(manager, {
    index: 'twr98yz9itca86121ukrqber',
    documents: records,
  });

  console.log(`search updated: ${records.length} records`);
}
