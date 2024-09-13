import env from '@next/env';
import { updateSearchIndexes } from './update-index.mjs';

env.loadEnvConfig(process.cwd());

async function main() {
  await updateSearchIndexes();
}

await main().catch((e) => {
  console.error('Failed to run post build script', e);
});
