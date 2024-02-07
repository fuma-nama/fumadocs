import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import fg from 'fast-glob';
import type { GenerateOptions } from './generate';
import { generate, generateTags } from './generate';

export interface Config {
  /**
   * Schema files
   */
  input: string[] | string;

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

  cwd?: string;
}

export async function generateFiles({
  input,
  output,
  name: nameFn,
  per = 'file',
  render,
  cwd = process.cwd(),
}: Config): Promise<void> {
  const outputDir = join(cwd, output);
  const options = {
    render,
  };

  const resolvedInputs = await fg.glob(input, { absolute: true, cwd });

  await Promise.all(
    resolvedInputs.map(async (path) => {
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

          const outPath = join(outputDir, filename, `${tagName}.mdx`);

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
