import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import fg from 'fast-glob';
import { generateOperations, type GenerateOptions } from './generate';
import { generate, generateTags } from './generate';

export interface Config extends GenerateOptions {
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
  per?: 'tag' | 'file' | 'operation';

  /**
   * Specify name for output file
   */
  name?: (type: 'file' | 'tag', name: string) => string;

  cwd?: string;
}

export async function generateFiles({
  input,
  output,
  name: nameFn,
  per = 'file',
  cwd = process.cwd(),
  ...options
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

      if (per === 'operation') {
        const results = await generateOperations(path, options);

        await Promise.all(
          results.map(async (result) => {
            const outPath = join(
              outputDir,
              filename,
              `${getName(result.id)}.mdx`,
            );
            await write(outPath, result.content);
            console.log(`Generated: ${outPath}`);
          }),
        );
        return;
      }

      const results = await generateTags(path, options);

      for (const result of results) {
        let tagName = result.tag;
        tagName = nameFn?.('tag', tagName) ?? getName(tagName);

        const outPath = join(outputDir, filename, `${tagName}.mdx`);
        await write(outPath, result.content);
        console.log(`Generated: ${outPath}`);
      }
    }),
  );
}

function getName(s: string): string {
  return s
    .replace(/[A-Z]/g, (match, idx: number) =>
      idx === 0 ? match : `-${match.toLowerCase()}`,
    )
    .replace(/\s+/g, '-')
    .toLowerCase();
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
