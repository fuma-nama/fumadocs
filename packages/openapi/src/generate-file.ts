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
   * @deprecated Use `groupBy` instead
   * @defaultValue false
   */
  groupByFolder?: boolean;

  /**
   * Group output using folders (Only works on `operation` mode)
   *
   * @defaultValue 'none'
   */
  groupBy?: 'tag' | 'route' | 'none';

  cwd?: string;
}

export async function generateFiles({
  input,
  output,
  name: nameFn,
  per = 'file',
  cwd = process.cwd(),
  groupBy = 'none',
  ...options
}: Config): Promise<void> {
  const outputDir = join(cwd, output);
  const resolvedInputs = await fg.glob(input, { absolute: true, cwd });

  await Promise.all(
    resolvedInputs.map(async (path) => {
      if (per === 'file') {
        let filename = parse(path).name;
        if (nameFn) filename = nameFn('file', filename);

        const outPath = join(outputDir, `${filename}.mdx`);

        const result = await generate(path, options);
        await write(outPath, result);
        console.log(`Generated: ${outPath}`);
        return;
      }

      if (per === 'operation') {
        const metaFiles = new Set<string>();
        const results = await generateOperations(path, options);

        await Promise.all(
          results.map(async (result) => {
            let outPath;
            if (!result.method.operationId) return;
            const id =
              result.method.operationId.split('.').at(-1) ??
              result.method.operationId;

            if (
              groupBy === 'tag' &&
              result.method.tags &&
              result.method.tags.length > 0
            ) {
              if (result.method.tags.length > 1)
                console.warn(
                  `${result.route.path} has more than 1 tag, which isn't allowed under 'groupBy: tag'. Only the first tag will be considered.`,
                );

              outPath = join(
                outputDir,
                getFilename(result.method.tags[0]),
                `${getFilename(id)}.mdx`,
              );
            } else if (groupBy === 'route') {
              outPath = join(
                outputDir,
                result.route.summary
                  ? getFilename(result.route.summary)
                  : getFilenameFromRoute(result.route.path),
                `${getFilename(id)}.mdx`,
              );

              const metaFile = join(dirname(outPath), 'meta.json');
              if (result.route.summary && !metaFiles.has(metaFile)) {
                metaFiles.add(metaFile);

                await write(
                  metaFile,
                  JSON.stringify({
                    title: result.route.summary,
                  }),
                );
                console.log(`Generated Meta: ${metaFile}`);
              }
            } else {
              outPath = join(outputDir, `${getFilename(id)}.mdx`);
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

        const outPath = join(outputDir, `${tagName}.mdx`);
        await write(outPath, result.content);
        console.log(`Generated: ${outPath}`);
      }
    }),
  );
}

function getFilenameFromRoute(path: string): string {
  return (
    path
      .replaceAll('.', '/')
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
