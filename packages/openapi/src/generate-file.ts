import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import fg from 'fast-glob';
import {
  generateAll,
  type GenerateOptions,
  type GeneratePageOutput,
  generatePages,
  generateTags,
} from './generate';

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

  if (resolvedInputs.length === 0) {
    throw new Error(
      `No input files found. Tried resolving: ${
        typeof input === 'string' ? input : input.join(', ')
      }`,
    );
  }

  function getOutputPaths(result: GeneratePageOutput): string[] {
    let file;

    if (result.pathItem.summary) {
      file = getFilename(result.pathItem.summary);
    } else if (result.type === 'operation') {
      file = result.operation.operationId
        ? getFilename(result.operation.operationId)
        : join(
            getOutputPathFromRoute(result.item.path),
            result.item.method.toLowerCase(),
          );
    } else {
      file = getFilename(result.item.name);
    }

    const outPaths: string[] = [];

    if (groupBy === 'tag') {
      let tags = result.operation.tags;
      if (!tags || tags.length === 0) {
        console.warn(
          'When `groupBy` is set to `tag`, make sure a `tags` is defined for every operation schema.',
        );

        tags = ['unknown'];
      }

      for (const tag of tags) {
        outPaths.push(join(outputDir, getFilename(tag), `${file}.mdx`));
      }
    } else {
      outPaths.push(join(outputDir, `${file}.mdx`));
    }

    return outPaths;
  }

  const metaFiles = new Set<string>();
  async function writeMetafile(file: string, data: object) {
    if (metaFiles.has(file)) return;
    metaFiles.add(file);

    await write(file, JSON.stringify(data, null, 2));
    console.log(`Generated Meta: ${file}`);
  }

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
      const results = await generatePages(pathOrUrl, options);

      for (const result of results) {
        const outputPaths = getOutputPaths(result);
        await Promise.all(
          outputPaths.map(async (outPath) => {
            await write(outPath, result.content);

            if (groupBy === 'route' && result.pathItem.summary) {
              await writeMetafile(join(dirname(outPath), 'meta.json'), {
                title: result.pathItem.summary,
              });
            }
          }),
        );

        console.log(`Generated: ${outputPaths.join(', ')}`);
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

function getOutputPathFromRoute(path: string): string {
  return (
    path
      .replaceAll('.', '/')
      .split('/')
      .filter((v) => !v.startsWith('{') && !v.endsWith('}'))
      .at(-1) ?? ''
  );
}

function getFilename(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
