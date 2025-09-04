import { sync, type OramaDocument } from 'fumadocs-core/search/orama-cloud';
import * as fs from 'node:fs/promises';
import { OramaCloud } from '@orama/core';

export async function updateSearchIndexes(): Promise<void> {
  const apiKey = process.env.ORAMA_PRIVATE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID;
  const datasourceId = process.env.NEXT_PUBLIC_ORAMA_DATASOURCE_ID;

  if (!apiKey) {
    console.log('no api key for Orama found, skipping');
    return;
  }

  if (!projectId) {
    console.log('no project id for Orama found, skipping');
    return;
  }

  if (!datasourceId) {
    console.log('no datasource id for Orama found, skipping');
    return;
  }

  const content = await fs.readFile('.next/server/app/static.json.body');
  const records = JSON.parse(content.toString()) as OramaDocument[];

  const manager = new OramaCloud({
    apiKey,
    projectId,
  });

  await sync(manager, {
    index: datasourceId,
    documents: records,
  });

  console.log(`search updated: ${records.length} records`);
}

await updateSearchIndexes();
