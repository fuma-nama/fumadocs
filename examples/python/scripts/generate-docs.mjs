import { rimraf } from 'rimraf';
import * as Python from 'fumadocs-python';
import * as fs from 'node:fs/promises';

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
}

void generate();
