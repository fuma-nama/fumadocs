import { generateDocs } from '@/scripts/generate-docs.mjs';
import { buildRegistry } from '@/scripts/build-registry.mjs';

async function main() {
  await Promise.all([generateDocs(), buildRegistry()]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
});
