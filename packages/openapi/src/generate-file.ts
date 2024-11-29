import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import fg from 'fast-glob';
import { generatePages, type GenerateOptions } from './generate';
import { generateAll, generateTags } from './generate';

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
   * file: Generate a page for each schema
   * operation: Generate a page for each API endpoint/operation
   *
   * @defaultValue 'operation'
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
}

export async function generateFiles(options: Config): Promise<void> {
  const {
    input,
    output,
    name: nameFn,
    per = 'operation',
    groupBy = 'none',
    cwd = process.cwd(),
  } = options;
  const outputDir = join(cwd, output);
  const urlInputs: string[] = [];
  const fileInputs: string[] = [];

  for (const v of typeof input === 'string' ? [input] : input) {
    if (isUrl(v)) {
      urlInputs.push(v);
    } else {
      fileInputs.push(v);
    }
  }

  const resolvedInputs = [
    ...(await fg.glob(fileInputs, { cwd, absolute: false })),
    ...urlInputs,
  ];

  async function generateFromDocument(pathOrUrl: string) {
    if (per === 'file') {
      let filename = isUrl(pathOrUrl) ? 'index' : parse(pathOrUrl).name;
      if (nameFn) filename = nameFn('file', filename);

      const outPath = join(outputDir, `${filename}.mdx`);

      const result = await generateAll(pathOrUrl, options);
      await write(outPath, result);
      console.log(`Generated: ${outPath}`);
    }

    if (per === 'operation') {
      const metaFiles = new Set<string>();
      const results = await generatePages(pathOrUrl, options);

      for (const result of results) {
        let name =
          result.type === 'operation'
            ? result.operation.operationId
            : result.item.name;
        if (!name) return;

        name = name.split('.').at(-1) ?? name;
        const outPaths: string[] = [];

        if (groupBy === 'tag') {
          const tags = result.operation.tags;

          if (tags && tags.length > 0) {
            for (const tag of tags) {
              outPaths.push(
                join(outputDir, getFilename(tag), `${getFilename(name)}.mdx`),
              );
            }
          } else {
            outPaths.push(
              result.type === 'operation'
                ? join(outputDir, `${getFilename(name)}.mdx`)
                : join(outputDir, 'webhooks', `${getFilename(name)}.mdx`),
            );
          }
        }

        if (groupBy === 'route') {
          const dir = result.pathItem.summary
            ? getFilename(result.pathItem.summary)
            : getFilenameFromRoute(
                result.type === 'operation'
                  ? result.item.path
                  : result.item.name,
              );

          const outPath = join(outputDir, dir, `${getFilename(name)}.mdx`);
          const metaFile = join(dirname(outPath), 'meta.json');
          if (result.pathItem.summary && !metaFiles.has(metaFile)) {
            metaFiles.add(metaFile);

            await write(
              metaFile,
              JSON.stringify({
                title: result.pathItem.summary,
              }),
            );
            console.log(`Generated Meta: ${metaFile}`);
          }

          outPaths.push(outPath);
        }

        if (groupBy === 'none') {
          outPaths.push(join(outputDir, `${getFilename(name)}.mdx`));
        }

        for (const outPath of outPaths) {
          await write(outPath, result.content);
          console.log(`Generated: ${outPath}`);
        }
      }
    }

    if (per === 'tag') {
      const results = await generateTags(pathOrUrl, options);

      for (const result of results) {
        let tagName = result.tag;
        tagName = nameFn?.('tag', tagName) ?? getFilename(tagName);

        const outPath = join(outputDir, `${tagName}.mdx`);
        await write(outPath, result.content);
        console.log(`Generated: ${outPath}`);
      }
    }
  }

  await Promise.all(resolvedInputs.map(generateFromDocument));
}

function isUrl(input: string): boolean {
  return input.startsWith('https://') || input.startsWith('http://');
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
