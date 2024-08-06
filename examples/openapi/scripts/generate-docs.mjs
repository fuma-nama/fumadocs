import * as OpenAPI from 'fumadocs-openapi';
import { rimrafSync } from 'rimraf';

rimrafSync('./content/docs/(api)', {
  filter(v) {
    return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
  },
});

void OpenAPI.generateFiles({
  input: ['./unkey.json'],
  output: './content/docs/(api)',
  per: 'operation',
  groupBy: 'tag',
});
