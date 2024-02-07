#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateFiles, type Config } from './generate-file';

async function main(): Promise<void> {
  const configName = process.argv[2];
  const config = await readConfig(configName);

  await generateFiles(config);
}

async function readConfig(name = 'openapi.config.js'): Promise<Config> {
  const path = resolve(process.cwd(), name);
  const result = (await import(pathToFileURL(path).href)) as {
    default: Config;
  };

  if (typeof result.default !== 'object')
    throw new Error('Invalid configuration');

  return result.default;
}

void main();
