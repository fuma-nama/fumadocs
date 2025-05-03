import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
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
      file = path.join(
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
        outPaths.push(path.join(getFilename(tag), `${file}.mdx`));
      }
    } else {
      outPaths.push(`${file}.mdx`);
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
    const outputDir = path.join(cwd, output);

    if (per === 'file') {
      let filename = isUrl(pathOrUrl)
        ? 'index'
        : path.basename(pathOrUrl, path.extname(pathOrUrl));
      if (nameFn) filename = nameFn('file', filename);

      const outPath = path.join(outputDir, `${filename}.mdx`);

      const result = await generateAll(pathOrUrl, options);
      await write(outPath, result);
      console.log(`Generated: ${outPath}`);
    }

    if (per === 'operation') {
      const results = await generatePages(pathOrUrl, options);
      const mapping = new Map<string, GeneratePageOutput>();

      for (const result of results) {
        const outputPaths = getOutputPaths(result);
        for (const outputPath of outputPaths) {
          mapping.set(outputPath, result);
        }
      }

      for (const [key, output] of mapping.entries()) {
        let outputPath = key;
        const isSharedDir = Array.from(mapping.keys()).some(
          (item) =>
            item !== outputPath &&
            path.dirname(item) === path.dirname(outputPath),
        );

        if (!isSharedDir && path.dirname(outputPath) !== '.') {
          outputPath = path.join(path.dirname(outputPath) + '.mdx');
        }

        await write(path.join(outputDir, outputPath), output.content);

        if (groupBy === 'route' && output.pathItem.summary) {
          await writeMetafile(
            path.join(outputDir, path.dirname(outputPath), 'meta.json'),
            {
              title: output.pathItem.summary,
            },
          );
        }

        console.log(`Generated: ${outputPath}`);
      }
    }

    if (per === 'tag') {
      const results = await generateTags(pathOrUrl, options);

      for (const result of results) {
        let tagName = result.tag;
        tagName = nameFn?.('tag', tagName) ?? getFilename(tagName);

        const outPath = path.join(outputDir, `${tagName}.mdx`);
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
      .toLowerCase()
      .replaceAll('.', '-')
      .split('/')
      .map((v) => {
        if (v.startsWith('{') && v.endsWith('}')) return v.slice(1, -1);
        return v;
      })
      .join('/') ?? ''
  );
}

function getFilename(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}

async function write(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}
