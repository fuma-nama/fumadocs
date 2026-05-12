import { buildRegistry } from './build-registry.ts';

async function main() {
  await Promise.all([buildRegistry()]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
  process.exit(1);
});
