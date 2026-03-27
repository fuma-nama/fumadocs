import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { generateDocument, type PagesToTextOptions, toText } from './utils/pages/to-text';
import type { ProcessedDocument } from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';
import { createGetUrl, getSlugs, PathUtils } from 'fumadocs-core/source';
import { createAutoPreset, type SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { fromSchema, type OutputGroup, type OutputEntry } from '@/utils/pages/builder';
import type { DistributiveOmit } from './types';

export interface OutputFile {
  path: string;
  content: string;
}

interface IndexConfig {
  items: IndexItem[] | ((ctx: BeforeWriteContext) => IndexItem[]);

  /**
   * Generate URLs for cards
   */
  url:
    | ((filePath: string) => string)
    | {
        baseUrl: string;
        /**
         * Base content directory
         */
        contentDir: string;
      };
}

interface IndexItem {
  /** output path of index page */
  path: string;
  title?: string;
  description?: string;

  /**
   * Specify linked pages:
   * - items in `inputs` to include all generated pages of a specific schema.
   * - file paths (using forward slash).
   */
  only?: string[];
}

interface GenerateFilesConfig extends PagesToTextOptions {
  /**
   * the OpenAPI server object
   */
  input: OpenAPIServer;

  /**
   * Output directory
   */
  output: string;

  /**
   * Generate index files with cards linking to generated pages.
   */
  index?: IndexConfig;

  /**
   * Generate `meta.json` files.
   *
   * Note: for flexibility, it's recommended to define them on your own.
   */
  meta?: boolean | MetaOptions;

  /**
   * Can add/change/remove output files before writing to file system
   **/
  beforeWrite?: (this: BeforeWriteContext, files: OutputFile[]) => void | Promise<void>;
}

interface MetaOptions {
  groupStyle?: 'folder' | 'separator';
}

export type Config = SchemaToPagesOptions &
  GenerateFilesConfig & {
    /**
     * Re-generate when **schema files are changed**, ignores custom input functions & URLs.
     *
     * Note: it is recommended to configure & use `chokidar` on your own, this is only for simple cases.
     */
    watch?: boolean;
  };

interface BeforeWriteContext {
  readonly generated: Record<string, OutputFile[]>;
  readonly generatedEntries: Record<string, OutputEntry[]>;
  readonly documents: Record<string, ProcessedDocument>;
}

export async function generateFiles(options: Config): Promise<void> {
  if (options.watch) {
    const { watch } = await import('chokidar');
    const subOptions: Config = { ...options, watch: false };

    await generateFiles(subOptions);
    const targets = options.input._getWatchPaths();
    console.log(`[Fumadocs OpenAPI] watching ${targets.join(', ')}`);
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
  const schemas = await options.input.getSchemas();

  const files: OutputFile[] = [];
  const generated: Record<string, OutputFile[]> = {};
  const generatedEntries: Record<string, OutputEntry[]> = {};

  const entries = Object.entries(schemas);
  if (entries.length === 0) {
    throw new Error('No input files found.');
  }
  const preset = createAutoPreset(options);
  for (const [id, schema] of entries) {
    const entries = fromSchema(id, schema, preset);
    const schemaFiles: OutputFile[] = [];

    generatedEntries[id] = entries;
    function scan(entry: OutputEntry) {
      if (entry.type === 'group') {
        for (const child of entry.entries) scan(child);
        return;
      }

      schemaFiles.push({
        path: entry.path,
        content: toText(entry, schema, options),
      });
    }

    for (const entry of entries) scan(entry);
    generated[id] = schemaFiles;
    files.push(...schemaFiles);
  }

  const context: BeforeWriteContext = {
    generated,
    generatedEntries,
    documents: schemas,
  };

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
  const { groupStyle = 'folder' } = options;

  function scan(entries: OutputEntry[], parent?: OutputGroup) {
    const pages: string[] = [];

    for (const entry of entries) {
      const relativePath = PathUtils.slash(
        parent ? path.relative(parent.path, entry.path) : entry.path,
      );

      if (entry.type === 'group') {
        scan(entry.entries, entry);

        if (groupStyle === 'folder') {
          pages.push(relativePath);
        } else {
          pages.push(`---${entry.info.title}---`, `...${relativePath}`);
        }
      } else {
        pages.push(relativePath.slice(0, -path.extname(entry.path).length));
      }
    }

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
  const files: OutputFile[] = [];
  const { generatedEntries } = context;
  const pathToEntry = new Map<string, OutputEntry>();
  const { items, url } = options.index!;

  function indexEntry(entry: OutputEntry) {
    pathToEntry.set(PathUtils.slash(entry.path), entry);
    if (entry.type === 'group') {
      for (const child of entry.entries) {
        indexEntry(child);
      }
    }
  }

  let urlFn: (path: string) => string;
  if (typeof url === 'object') {
    const getUrl = createGetUrl(url.baseUrl);

    urlFn = (file) => getUrl(getSlugs(path.relative(url.contentDir, file)));
  } else {
    urlFn = url;
  }

  function fileContent(index: IndexItem): string {
    const content: string[] = [];
    content.push('<Cards>');
    const outputEntries: OutputEntry[] = [];
    const only = index.only ?? Object.keys(context.generated);

    for (const item of only) {
      if (generatedEntries[item]) {
        for (const entry of generatedEntries[item]) {
          outputEntries.push(entry);
        }
      } else {
        const match = pathToEntry.get(item);
        if (!match) {
          throw new Error(
            `${item} does not exist on "input", available: ${Object.keys(generatedEntries).join(', ')}.`,
          );
        }

        outputEntries.push(match);
      }
    }

    for (const entry of outputEntries) {
      // cannot link to groups
      if (entry.type === 'group') continue;
      const descriptionAttr = entry.info.description
        ? `description=${JSON.stringify(entry.info.description)} `
        : '';
      content.push(
        `<Card href="${urlFn(entry.path)}" title=${JSON.stringify(entry.info.title)} ${descriptionAttr}/>`,
      );
    }

    content.push('</Cards>');
    return generateDocument(
      {
        title: index.title ?? 'Overview',
        description: index.description,
      },
      content.join('\n'),
      options,
    );
  }

  for (const list of Object.values(context.generatedEntries)) {
    for (const item of list) indexEntry(item);
  }

  for (const item of typeof items === 'function' ? items(context) : items) {
    files.push({
      path: path.extname(item.path).length === 0 ? `${item.path}.mdx` : item.path,
      content: fileContent(item),
    });
  }

  return files;
}
