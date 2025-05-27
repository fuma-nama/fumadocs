import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';

export async function generateDocs() {
  await rimraf('./content/docs/openapi/(generated)');

  await Promise.all([
    OpenAPI.generateFiles({
      input: ['./museum.yaml'],
      output: './content/docs/openapi/(generated)',
      per: 'operation',
      includeDescription: true,
    }),
  ]);
}
