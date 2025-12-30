import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { generateDocument, type PagesToTextOptions, toText } from './utils/pages/to-text';
import type { ProcessedDocument } from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';
import { createGetUrl, getSlugs } from 'fumadocs-core/source';
import { createAutoPreset, type SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { fromSchema, type OutputEntry } from '@/utils/pages/builder';

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
  path: string;
  title?: string;
  description?: string;

  /**
   * Specify linked pages:
   * - items in `inputs` to include all generated pages of a specific schema.
   * - specific Markdown/MDX files.
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
   * Can add/change/remove output files before writing to file system
   **/
  beforeWrite?: (this: BeforeWriteContext, files: OutputFile[]) => void | Promise<void>;
}

export type Config = SchemaToPagesOptions & GenerateFilesConfig;

interface BeforeWriteContext {
  readonly generated: Record<string, OutputFile[]>;
  readonly generatedEntries: Record<string, OutputEntry[]>;
  readonly documents: Record<string, ProcessedDocument>;
}

export async function generateFiles(options: Config): Promise<void> {
  const files = await generateFilesOnly(options);
  const { output } = options;

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(output, file.path);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content);
      console.log(`Generated: ${filePath}`);
    }),
  );
}

export async function generateFilesOnly(
  options: SchemaToPagesOptions & Omit<GenerateFilesConfig, 'output'>,
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
    const schemaFiles = (generated[id] ??= []);

    generatedEntries[id] = entries;
    for (const entry of entries) {
      const file: OutputFile = {
        path: entry.path,
        content: toText(entry, schema, options),
      };

      schemaFiles.push(file);
      files.push(file);
    }
  }

  const context: BeforeWriteContext = {
    generated,
    generatedEntries,
    documents: schemas,
  };

  if (options.index) {
    writeIndexFiles(files, context, options);
  }

  await options.beforeWrite?.call(context, files);
  return files;
}

function writeIndexFiles(
  files: OutputFile[],
  context: BeforeWriteContext,
  options: SchemaToPagesOptions & Omit<GenerateFilesConfig, 'output'>,
) {
  const { generatedEntries } = context;
  const { items, url } = options.index!;

  let urlFn: (path: string) => string;
  if (typeof url === 'object') {
    const getUrl = createGetUrl(url.baseUrl);

    urlFn = (file) => getUrl(getSlugs(path.relative(url.contentDir, file)));
  } else {
    urlFn = url;
  }

  function findEntryByPath(path: string) {
    for (const entries of Object.values(generatedEntries)) {
      const match = entries.find((entry) => entry.path === path);

      if (match) return match;
    }
  }

  function fileContent(index: IndexItem): string {
    const content: string[] = [];
    content.push('<Cards>');
    const pathToEntry = new Map<string, OutputEntry>();
    const only = index.only ?? Object.keys(context.generated);

    for (const item of only) {
      if (generatedEntries[item]) {
        for (const entry of generatedEntries[item]) {
          pathToEntry.set(entry.path, entry);
        }
      } else {
        const match = findEntryByPath(item);
        if (!match) {
          throw new Error(
            `${item} does not exist on "input", available: ${Object.keys(generatedEntries).join(', ')}.`,
          );
        }

        pathToEntry.set(match.path, match);
      }
    }

    for (const file of pathToEntry.values()) {
      const descriptionAttr = file.info.description
        ? `description=${JSON.stringify(file.info.description)} `
        : '';
      content.push(
        `<Card href="${urlFn(file.path)}" title=${JSON.stringify(file.info.title)} ${descriptionAttr}/>`,
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

  for (const item of typeof items === 'function' ? items(context) : items) {
    files.push({
      path: path.extname(item.path).length === 0 ? `${item.path}.mdx` : item.path,
      content: fileContent(item),
    });
  }
}
