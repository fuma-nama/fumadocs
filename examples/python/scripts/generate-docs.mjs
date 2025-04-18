import { rimraf } from 'rimraf';
import * as Python from 'fumadocs-python';
import * as fs from 'node:fs/promises';

async function generate() {
  const out = 'content/docs/httpx';
  await rimraf(out);

  const content = JSON.parse((await fs.readFile('./httpx.json')).toString());
  const converted = Python.convert(content, {
    baseUrl: '/docs',
  }).filter((file) => !file.path.startsWith('httpx/_transports'));

  await Python.write(converted, {
    outDir: out,
  });
}

void generate();
