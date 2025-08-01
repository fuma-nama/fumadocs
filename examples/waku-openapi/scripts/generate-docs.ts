import { generateFiles } from 'fumadocs-openapi';

void generateFiles({
  input: ['https://cdn.jsdelivr.net/npm/@scalar/galaxy/dist/latest.yaml'],
  output: './content/docs/(generated)',
  includeDescription: true,
});
