import env from '@next/env';

env.loadEnvConfig(process.cwd());

async function main() {
  const { updateSearchIndexes } = await import('./update-orama-index.ts');
  await Promise.all([updateSearchIndexes()]);
}

await main().catch((e) => {
  console.error('Failed to run post build script', e);
});
