import { mkdir, writeFile } from 'node:fs/promises';
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
   * @defaultValue file
   */
  per?: 'tag' | 'file';

  /**
   * Specify name for output file
   */
  name?: (type: 'file' | 'tag', name: string) => string;

  /**
   * Customise Generator
   */
  options?: GenerateOptions;

  cwd?: string;
}

export async function generateFiles({
  input,
  output,
  name: nameFn,
  per = 'file',
  options,
  cwd = process.cwd(),
}: Config): Promise<void> {
  const outputDir = join(cwd, output);

  const resolvedInputs = await fg.glob(input, { absolute: true, cwd });

  await Promise.all(
    resolvedInputs.map(async (path) => {
      let filename = parse(path).name;
      filename = nameFn?.('file', filename) ?? filename;

      if (per === 'file') {
        const outPath = join(outputDir, `${filename}.mdx`);

        const result = await generate(path, options);
        await write(outPath, result);
        console.log(`Generated: ${outPath}`);
        return;
      }

      const results = await generateTags(path, options);

      for (const result of results) {
        let tagName = result.tag;
        tagName =
          nameFn?.('tag', tagName) ??
          tagName.toLowerCase().replace(/\s+/g, '-');

        const outPath = join(outputDir, filename, `${tagName}.mdx`);
        await write(outPath, result.content);
        console.log(`Generated: ${outPath}`);
      }
    }),
  );
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
