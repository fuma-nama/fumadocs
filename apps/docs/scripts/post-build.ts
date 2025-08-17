import env from '@next/env';
import { updateSearchIndexes } from './update-orama-index';

env.loadEnvConfig(process.cwd());

async function main() {
  await Promise.all([updateSearchIndexes()]);
}

await main().catch((e) => {
  console.error('Failed to run post build script', e);
});
