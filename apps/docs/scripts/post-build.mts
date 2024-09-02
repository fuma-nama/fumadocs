import env from '@next/env';
import { updateSearchIndexes } from './update-index.mjs';
import { readFile } from 'node:fs/promises';
import type { Manifest } from 'fumadocs-mdx';

env.loadEnvConfig(process.cwd());

async function main() {
  const manifest = JSON.parse(
    (await readFile('.source/manifest.json')).toString(),
  ) as Manifest;

  await updateSearchIndexes(manifest);
}

await main().catch((e) => {
  console.error('Failed to run post build script', e);
});
