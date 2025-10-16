import { buildRegistry } from '@/scripts/build-registry';

async function main() {
  await Promise.all([buildRegistry()]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
  process.exit(1);
});
