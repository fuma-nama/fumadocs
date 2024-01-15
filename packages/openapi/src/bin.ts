#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GenerateOptions } from './generate';
import { generate, generateTags } from './generate';

async function main(): Promise<void> {
  const configName = process.argv[2];
  const {
    input,
    output,
    name: nameFn,
    per = 'file',
    render,
  } = await readConfig(configName);
  const outputDir = resolve(output);

  const options = {
    render,
  };

  await Promise.all(
    input.map(async (file) => {
      const path = resolve(file);
      let filename = parse(path).name;
      filename = nameFn?.('file', filename) ?? filename;

      if (per === 'file') {
        const outPath = join(outputDir, `${filename}.mdx`);

        const result = await generate(path, options);
        write(outPath, result);
        console.log(`Generated: ${outPath}`);
      } else {
        const results = await generateTags(path, options);

        results.forEach((result) => {
          let tagName = result.tag;
          tagName =
            nameFn?.('tag', tagName) ??
            tagName.toLowerCase().replace(/\s+/g, '-');

          const outPath = join(outputDir, `${filename}/${tagName}.mdx`);

          write(outPath, result.content);
          console.log(`Generated: ${outPath}`);
        });
      }
    }),
  );
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export interface Config {
  /**
   * Schema files
   */
  input: string[];

  /**
   * Output directory
   */
  output: string;

  /**
   * tag: Generate a page for each tag
   *
   * file: Generate a page for each schema
   *
   * @defaultValue tag
   */
  per?: 'tag' | 'file';

  /**
   * Specify name for output file
   */
  name?: (type: 'file' | 'tag', name: string) => string;

  /**
   * Modify output file
   */
  render?: NonNullable<GenerateOptions['render']>;
}

async function readConfig(name = 'openapi.config.js'): Promise<Config> {
  const path = resolve(process.cwd(), name);
  const result = (await import(pathToFileURL(path).toString())) as {
    default: Config;
  };

  if (typeof result.default !== 'object')
    throw new Error('Invalid configuration');

  return result.default;
}

void main();
