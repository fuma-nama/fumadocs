import fs from 'node:fs/promises';
import { type Page } from 'fumadocs-core/source';
import { type FileData } from '@/github/types';
import { fetchBlob } from '@/github/fetch-blob';

export async function resolveFile<Data extends { data: FileData }>(
  page: Page<Data>,
): Promise<string | undefined> {
  const resolver = page.data.data.resolver;

  if (resolver.type === 'local') {
    return await fs.readFile(resolver.file).then((res) => res.toString());
  }

  const blob = await fetchBlob({
    url: resolver.blobUrl,
    accessToken: resolver.accessToken,
    init: {
      cache: 'force-cache',
    },
  });

  return blob.content;
}
