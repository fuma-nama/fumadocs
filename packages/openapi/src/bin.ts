#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDynamicPattern } from 'globby';
import { generateFiles, type Config } from './generate-file';
import { resolvePatterns } from './utils';

async function main(): Promise<void> {
  const configName = process.argv[2];
  const config = await readConfig(configName);

  await generateFiles(config);
}

async function readConfig(name = 'openapi.config.{js,ts}'): Promise<Config> {
  let path = resolve(process.cwd(), name);
  if (isDynamicPattern(name)) {
    const [resolved] = await resolvePatterns(name);
    path = resolved;
  }
  const result = (await import(pathToFileURL(path).toString())) as {
    default: Config;
  };

  if (typeof result.default !== 'object')
    throw new Error('Invalid configuration');

  return result.default;
}

void main();
