import * as OpenAPI from 'fumadocs-openapi';
import { rimraf } from 'rimraf';
import * as Python from 'fumadocs-python';
import * as fs from 'node:fs/promises';

const out = './content/docs/(api)';

async function generate() {
  const pythonOUt = 'content/docs/httpx';
  await rimraf(pythonOUt);

  const content = JSON.parse((await fs.readFile('./httpx.json')).toString());
  const converted = Python.convert(content, {
    baseUrl: '/docs',
  });

  await Python.write(converted, {
    outDir: pythonOUt,
  });

  // clean generated files
  await rimraf(out, {
    filter(v) {
      return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
    },
  });

  await OpenAPI.generateFiles({
    // input files
    input: ['./openapi.json'],
    output: out,
    groupBy: 'tag',
  });
}

void generate();
