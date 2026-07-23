import fs from 'node:fs/promises';
import path from 'node:path';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createLocalSource,
  type ContentIntegration,
  type LocalSource,
} from '@fumadocs/local-content';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { remarkHeading, type RemarkHeadingOptions } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkImage, type RemarkImageOptions } from 'fumadocs-core/mdx-plugins/remark-image';
import { remarkStructure, type StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure';
import { rehypeCode, type RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc, type RehypeTocOptions } from 'fumadocs-core/mdx-plugins/rehype-toc';
import type { MetaData, PageData } from 'fumadocs-core/source';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import remarkParse from 'remark-parse';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { glob } from 'tinyglobby';
import { unified, type Pluggable, type PluggableList } from 'unified';
import { VFile } from 'vfile';
import {
  buildStorage,
  getFileFormat,
  type ParsedContentFile,
  type VaultStorage,
  type VaultStorageOptions,
  type VaultFile,
} from './build-storage';
import { buildResolver, type VaultResolver } from './build-resolver';
import { getRemarkPlugins } from './remark';
import { createRenderer, type ObsidianRenderer } from './renderer';
import { slash } from './utils/slash';
import { frontmatterSchema as defaultFrontmatterSchema } from './utils/schema';

export const defaultInclude = ['**/*'];

/** cap concurrently open files while reading the vault */
const ReadChunkSize = 100;

export interface ObsidianCompilerOptions {
  /** additional remark plugins, applied after Obsidian syntax is resolved */
  remarkPlugins?: PluggableList;
  /** additional rehype plugins, applied before the TOC is collected */
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;

  remarkHeadingOptions?: RemarkHeadingOptions | false;
  /**
   * Inject sizes of images for Next.js Image, resolved against `publicDir`
   * (defaults to `./public`). `useImport` stays disabled, imports cannot be
   * rendered from the AST.
   */
  remarkImageOptions?: RemarkImageOptions | false;
  remarkStructureOptions?: StructureOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
  rehypeTocOptions?: RehypeTocOptions | false;
}

export interface ObsidianConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
>
  extends ObsidianCompilerOptions, Pick<VaultStorageOptions, 'url'> {
  /** root directory of the Obsidian vault */
  dir: string;
  /** glob patterns to scan, relative to the vault directory */
  include?: string[];
  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
}

export interface ObsidianSource<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> extends LocalSource<
  ObsidianPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>,
  StandardSchemaV1.InferOutput<MetaSchema> & MetaData
> {
  /**
   * Connect to the standalone local-content dev server. On Vite, prefer
   * `watchWithVite()` from `fumadocs-obsidian/dev/vite`.
   */
  devServer: (url?: string) => Promise<void>;
}

export interface ObsidianPage<Frontmatter = Record<string, unknown>> extends PageData {
  title: string;
  description?: string;
  icon?: string;
  content: string;
  frontmatter: Frontmatter;
  /** compile the page, at most once per vault snapshot */
  load: () => Promise<ObsidianRenderer>;
}

interface VaultContext {
  storage: VaultStorage;
  processor: ReturnType<typeof createProcessor>;
}

/** Create a runtime Fumadocs content source from an Obsidian vault. */
export function obsidian<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultFrontmatterSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
>(
  config: ObsidianConfig<FrontmatterSchema, MetaSchema>,
): ObsidianSource<FrontmatterSchema, MetaSchema> {
  type $Frontmatter = StandardSchemaV1.InferOutput<FrontmatterSchema>;
  type $Meta = StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
  type $Page = ObsidianPage<$Frontmatter>;

  const include = config.include ?? defaultInclude;
  const frontmatterSchema = config.frontmatterSchema ?? defaultFrontmatterSchema;
  const metaSchema = config.metaSchema ?? defaultSchemas.metaSchema;

  // vault files persist across snapshots so an invalidation only re-reads what changed
  const vaultFiles = new Map<string, VaultFile>();
  /** absolute paths waiting to be re-read on the next snapshot */
  const invalidated = new Set<string>();
  let vault: Promise<VaultContext> | undefined;

  function getVault(): Promise<VaultContext> {
    // drop failed snapshots, otherwise a transient error would stick until the next invalidation
    return (vault ??= createVault().catch((error: unknown) => {
      vault = undefined;
      throw error;
    }));
  }

  async function createVault(): Promise<VaultContext> {
    const paths = await glob(include, { cwd: config.dir, onlyFiles: true });
    const pending = new Set(invalidated);
    const scanned = new Set<string>();
    const toRead: VaultFile[] = [];

    for (const file of paths) {
      const vaultPath = slash(file);
      const absolutePath = path.resolve(config.dir, file);
      scanned.add(vaultPath);

      if (getFileFormat(vaultPath) === 'media') {
        // media files resolve to URLs, their content is never read into memory
        if (!vaultFiles.has(vaultPath)) {
          vaultFiles.set(vaultPath, { path: vaultPath, _raw: { path: absolutePath } });
        }
      } else if (!vaultFiles.has(vaultPath) || pending.has(absolutePath)) {
        toRead.push({ path: vaultPath, _raw: { path: absolutePath } });
      }
    }

    // drop files deleted since the last snapshot
    for (const vaultPath of vaultFiles.keys()) {
      if (!scanned.has(vaultPath)) vaultFiles.delete(vaultPath);
    }

    for (let i = 0; i < toRead.length; i += ReadChunkSize) {
      await Promise.all(
        toRead.slice(i, i + ReadChunkSize).map(async (file) => {
          file.content = await fs.readFile(file._raw.path);
          vaultFiles.set(file.path, file);
        }),
      );
    }

    for (const absolutePath of pending) invalidated.delete(absolutePath);

    const storage = buildStorage(vaultFiles.values(), { url: config.url });
    return { storage, processor: createProcessor(config, buildResolver(storage)) };
  }

  const integration: ContentIntegration<$Page, $Meta> = {
    include,
    async parse(file) {
      const context = await getVault();
      const parsed = context.storage.files.get(slash(file.path));
      if (!parsed) return;

      if (parsed.format === 'content') {
        const result = await frontmatterSchema['~standard'].validate(parsed.frontmatter);
        if (result.issues) {
          throw new Error(
            `invalid frontmatter in "${file.absolutePath}": ${formatIssues(result.issues)}`,
          );
        }

        const frontmatter = result.value as $Frontmatter;
        const pageData = frontmatter as PageData & { _openapi?: unknown };
        let loaded: Promise<ObsidianRenderer> | undefined;

        return {
          type: 'page',
          data: {
            title: pageData.title ?? path.basename(file.path, path.extname(file.path)),
            description: pageData.description,
            icon: pageData.icon,
            ['_openapi' as never]: pageData._openapi,
            content: parsed.content,
            frontmatter,
            load() {
              return (loaded ??= compilePage(context.processor, parsed, frontmatter));
            },
          },
        };
      }

      if (parsed.format === 'data' && path.extname(file.path) === '.json') {
        const result = await metaSchema['~standard'].validate(JSON.parse(String(parsed.content)));
        if (result.issues) {
          throw new Error(`invalid data in "${file.absolutePath}": ${formatIssues(result.issues)}`);
        }

        return { type: 'meta', data: result.value as $Meta };
      }
    },
  };

  const source = createLocalSource({ dir: config.dir, include, integration });

  return {
    ...source,
    invalidateAll() {
      vaultFiles.clear();
      invalidated.clear();
      vault = undefined;
      source.invalidateAll();
    },
    invalidateFile(file) {
      // Every page can resolve names and aliases from every other vault file.
      // Rebuild the snapshot so a rename cannot leave stale links behind, but
      // only re-read the invalidated file from disk.
      invalidated.add(path.resolve(file));
      vault = undefined;
      source.invalidateAll();
    },
  };
}

function createProcessor(options: ObsidianCompilerOptions, resolver: VaultResolver) {
  const {
    remarkPlugins = [],
    rehypePlugins = [],
    remarkRehypeOptions,
    remarkHeadingOptions,
    remarkImageOptions,
    remarkStructureOptions,
    rehypeCodeOptions,
    rehypeTocOptions,
  } = options;

  return (
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      // resolve Obsidian syntax first so other plugins receive standard Markdown
      .use(getRemarkPlugins(resolver))
      .use(
        plugins(
          remarkHeadingOptions !== false && [
            remarkHeading,
            { generateToc: false, ...remarkHeadingOptions },
          ],
          remarkImageOptions !== false && [
            remarkImage,
            { ...remarkImageOptions, useImport: false },
          ],
          ...remarkPlugins,
          remarkStructureOptions !== false && [remarkStructure, remarkStructureOptions],
        ),
      )
      .use(remarkRehype, {
        passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'],
        ...remarkRehypeOptions,
      })
      .use(
        plugins(
          rehypeCodeOptions !== false && [rehypeCode, rehypeCodeOptions],
          ...rehypePlugins,
          rehypeTocOptions !== false && [
            rehypeToc,
            { exportToc: { as: 'data' }, ...rehypeTocOptions },
          ],
        ),
      )
  );
}

function plugins(...items: (Pluggable | false | null | undefined)[]): Pluggable[] {
  return items.filter((item): item is Pluggable => item !== false && item != null);
}

async function compilePage(
  processor: ReturnType<typeof createProcessor>,
  page: ParsedContentFile,
  frontmatter: unknown,
): Promise<ObsidianRenderer> {
  const file = new VFile({
    path: page._raw.path,
    value: page.content,
    data: { frontmatter, source: page },
  });

  const tree = await processor.run(processor.parse(file), file);

  return createRenderer({
    tree,
    filePath: page._raw.path,
    structuredData: file.data.structuredData,
    rehypeToc: file.data.rehypeToc,
  });
}

function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join('\n');
}
