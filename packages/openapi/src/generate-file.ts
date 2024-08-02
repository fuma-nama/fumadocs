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

  /**
   * Group output using folders (Only works on `operation` mode)
   *
   * @defaultValue false
   */
  groupByFolder?: boolean;

  cwd?: string;
}

export async function generateFiles({
  input,
  output,
  name: nameFn,
  per = 'file',
  cwd = process.cwd(),
  groupByFolder = false,
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
        const routeFolders = new Set<string>();
        const results = await generateOperations(path, options);

        await Promise.all(
          results.map(async (result) => {
            const outPath = groupByFolder
              ? join(
                  outputDir,
                  filename,
                  result.route.summary
                    ? getFilename(result.route.summary)
                    : getFilenameFromRoute(result.route.path),
                  `${getFilename(result.id)}.mdx`,
                )
              : join(outputDir, filename, `${getFilename(result.id)}.mdx`);

            if (groupByFolder && !routeFolders.has(dirname(outPath))) {
              routeFolders.add(dirname(outPath));

              if (result.route.summary) {
                const metaFile = join(dirname(outPath), 'meta.json');

                await write(
                  metaFile,
                  JSON.stringify({
                    title: result.route.summary,
                  }),
                );
                console.log(`Generated Meta: ${metaFile}`);
              }
            }

            await write(outPath, result.content);
            console.log(`Generated: ${outPath}`);
          }),
        );
        return;
      }

      const results = await generateTags(path, options);

      for (const result of results) {
        let tagName = result.tag;
        tagName = nameFn?.('tag', tagName) ?? getFilename(tagName);

        const outPath = join(outputDir, filename, `${tagName}.mdx`);
        await write(outPath, result.content);
        console.log(`Generated: ${outPath}`);
      }
    }),
  );
}

function getFilenameFromRoute(path: string): string {
  return (
    path
      .split('/')
      .filter((v) => !v.startsWith('{') && !v.endsWith('}'))
      .at(-1) ?? ''
  );
}

function getFilename(s: string): string {
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
