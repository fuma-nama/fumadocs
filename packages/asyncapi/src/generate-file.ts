import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { generateDocument, type PagesToTextOptions, toText } from './utils/pages/to-text';
import type { AsyncAPIServer } from '@/server';
import { createGetUrl, getSlugs, PathUtils } from 'fumadocs-core/source';
import { createAutoPreset, type SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { fromSchema, type OutputGroup, type OutputEntry } from '@/utils/pages/builder';
import { getMetaPages } from 'shared-api/source';
import type { DistributiveOmit } from './types';
import { jsxString } from './utils/string-utils';

export interface OutputFile {
  path: string;
  content: string;
}

interface IndexConfig {
  items: IndexItem[] | ((ctx: BeforeWriteContext) => IndexItem[]);
  url:
    | ((filePath: string) => string)
    | {
        baseUrl: string;
        contentDir: string;
      };
}

interface IndexItem {
  path: string;
  title?: string;
  description?: string;
  only?: string[];
}

interface GenerateFilesConfig extends PagesToTextOptions {
  input: AsyncAPIServer;
  output: string;
  index?: IndexConfig;
  meta?: boolean | MetaOptions;
  beforeWrite?: (this: BeforeWriteContext, files: OutputFile[]) => void | Promise<void>;
}

interface MetaOptions {
  folderStyle?: 'folder' | 'separator';
}

export type Config = SchemaToPagesOptions &
  GenerateFilesConfig & {
    watch?: boolean;
  };

interface BeforeWriteContext {
  readonly generated: Record<string, OutputFile[]>;
  readonly generatedEntries: Record<string, OutputEntry[]>;
}

export async function generateFiles(options: Config): Promise<void> {
  if (options.watch) {
    const { watch } = await import('chokidar');
    const subOptions: Config = { ...options, watch: false };

    await generateFiles(subOptions);
    const targets = options.input._getWatchPaths();
    console.log(`[Fumadocs AsyncAPI] watching ${targets.join(', ')}`);
    watch(targets, {
      ignoreInitial: true,
    }).on('all', () => generateFiles(subOptions));
    return;
  }

  const files = await generateFilesOnly(options);

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(options.output, file.path);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content);
      console.log(`Generated: ${filePath}`);
    }),
  );
}

export async function generateFilesOnly(
  options: DistributiveOmit<Config, 'output'>,
): Promise<OutputFile[]> {
  const schemas = Object.entries(await options.input.getSchemas());
  if (schemas.length === 0) {
    throw new Error('No input files found.');
  }

  const preset = createAutoPreset(options);
  const files: OutputFile[] = [];
  const context: BeforeWriteContext = { generated: {}, generatedEntries: {} };

  for (const [id, { bundled }] of schemas) {
    const entries = fromSchema(id, bundled, preset);
    const generated: OutputFile[] = [];

    function scan(entries: OutputEntry[]) {
      for (const entry of entries) {
        if (entry.type === 'group') {
          scan(entry.entries);
          continue;
        }

        const file = { path: entry.path, content: toText(entry, bundled, options) };
        generated.push(file);
        files.push(file);
      }
    }

    scan(entries);
    context.generatedEntries[id] = entries;
    context.generated[id] = generated;
  }

  if (options.index) {
    files.push(...writeIndexFiles(context, options));
  }

  if (options.meta) {
    files.push(...generateMeta(context, options.meta === true ? {} : options.meta));
  }

  await options.beforeWrite?.call(context, files);
  return files;
}

function generateMeta(context: BeforeWriteContext, options: MetaOptions): OutputFile[] {
  const files: OutputFile[] = [];
  const folderStyle = options.folderStyle ?? 'folder';

  function scan(entries: OutputEntry[], parent?: OutputGroup) {
    for (const entry of entries) {
      if (entry.type === 'group') scan(entry.entries, entry);
    }

    const pages = getMetaPages(entries, parent, folderStyle);
    if (pages.length === 0) return;
    files.push({
      path: parent ? path.join(parent.path, 'meta.json') : 'meta.json',
      content: JSON.stringify(
        {
          title: parent?.info.title,
          description: parent?.info.description,
          pages,
        },
        null,
        2,
      ),
    });
  }

  for (const entries of Object.values(context.generatedEntries)) {
    scan(entries);
  }

  return files;
}

function writeIndexFiles(
  context: BeforeWriteContext,
  options: SchemaToPagesOptions & Omit<GenerateFilesConfig, 'output'>,
): OutputFile[] {
  const { generatedEntries } = context;
  const { items, url } = options.index!;
  const pathToEntry = new Map<string, OutputEntry>();

  function indexEntry(entry: OutputEntry) {
    pathToEntry.set(PathUtils.slash(entry.path), entry);
    if (entry.type === 'group') {
      for (const child of entry.entries) indexEntry(child);
    }
  }

  for (const entries of Object.values(generatedEntries)) {
    for (const entry of entries) indexEntry(entry);
  }

  let urlFn: (path: string) => string;
  if (typeof url === 'object') {
    const getUrl = createGetUrl(url.baseUrl);

    urlFn = (file) => getUrl(getSlugs(path.relative(url.contentDir, file)));
  } else {
    urlFn = url;
  }

  function fileContent(index: IndexItem): string {
    let cards = '';
    function card(entry: OutputEntry) {
      // cannot link to groups
      if (entry.type === 'group') return;
      const descriptionAttr = entry.info.description
        ? `description=${jsxString(entry.info.description)} `
        : '';
      cards += `\n<Card href="${urlFn(entry.path)}" title=${jsxString(entry.info.title)} ${descriptionAttr}/>`;
    }

    for (const item of index.only ?? Object.keys(generatedEntries)) {
      const entries = generatedEntries[item];
      if (entries) {
        for (const entry of entries) card(entry);
        continue;
      }

      const match = pathToEntry.get(item);
      if (!match) {
        throw new Error(
          `${item} does not exist on "input", available: ${Object.keys(generatedEntries).join(', ')}.`,
        );
      }
      card(match);
    }

    return generateDocument(
      {
        title: index.title ?? 'Overview',
        description: index.description,
      },
      `<Cards>${cards}\n</Cards>`,
      options,
    );
  }

  const files: OutputFile[] = [];
  for (const item of typeof items === 'function' ? items(context) : items) {
    files.push({
      path: path.extname(item.path).length === 0 ? `${item.path}.mdx` : item.path,
      content: fileContent(item),
    });
  }

  return files;
}
