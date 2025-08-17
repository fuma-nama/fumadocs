import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';
import { openapi } from '@/lib/openapi';

const out = './content/docs/(api)';

async function generate() {
  // clean generated files
  await rimraf(out, {
    filter(v) {
      return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
    },
  });

  await OpenAPI.generateFiles({
    input: openapi,
    output: out,
  });
}

void generate();
