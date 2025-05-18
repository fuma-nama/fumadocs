import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';

export async function generateDocs() {
  const outputPath = './content/docs/openapi/generated';
  const normalizedPath = outputPath.replace(/\\/g, '/');

  await rimraf(normalizedPath);

  await Promise.all([
    OpenAPI.generateFiles({
      input: ['./content/docs/openapi/museum.yaml'],
      output: normalizedPath,
      per: 'operation',
    }),
  ]);
}
