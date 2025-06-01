import { buildRegistry } from '@/scripts/build-registry.mjs';
import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';

export async function generateDocs() {
  await rimraf('./content/docs/openapi/(generated)');

  await Promise.all([
    OpenAPI.generateFiles({
      input: ['./scalar.yaml'],
      output: './content/docs/openapi/(generated)',
      per: 'operation',
      includeDescription: true,
    }),
  ]);
}

async function main() {
  await Promise.all([generateDocs(), buildRegistry()]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
});
