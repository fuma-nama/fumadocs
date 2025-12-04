import type {
  DocCollectionItem,
  LoadedConfig,
  MetaCollectionItem,
} from '@/config/build';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { FSWatcher } from 'chokidar';
import { validate } from './utils/validation';
import type { VFile } from 'vfile';
import type { IndexFilePlugin } from './plugins/index-file';
import type { PostprocessOptions } from './config';
import { ident } from './utils/codegen';

type Awaitable<T> = T | Promise<T>;

export interface EmitEntry {
  /**
   * path relative to output directory
   */
  path: string;
  content: string;
}

export interface PluginContext extends CoreOptions {
  core: Core;
}

export type CompilationContext<Collection> = PluginContext &
  TransformOptions<Collection>;

export interface TransformOptions<Collection> {
  collection: Collection;
  filePath: string;
  source: string;
}

export interface Plugin extends IndexFilePlugin {
  name?: string;

  /**
   * on config loaded/updated
   */
  config?: (
    this: PluginContext,
    config: LoadedConfig,
  ) => Awaitable<void | LoadedConfig>;

  /**
   * Generate files (e.g. types, index file, or JSON schemas)
   */
  emit?: (this: PluginContext) => Awaitable<EmitEntry[]>;

  /**
   * Configure Fumadocs dev server
   */
  configureServer?: (
    this: PluginContext,
    server: ServerContext,
  ) => Awaitable<void>;

  meta?: {
    /**
     * Transform metadata
     */
    transform?: (
      this: CompilationContext<MetaCollectionItem>,
      data: unknown,
    ) => Awaitable<unknown | void>;
  };

  doc?: {
    /**
     * Transform frontmatter
     */
    frontmatter?: (
      this: CompilationContext<DocCollectionItem>,
      data: Record<string, unknown>,
    ) => Awaitable<Record<string, unknown> | void>;

    /**
     * Transform `vfile` on compilation stage
     */
    vfile?: (
      this: CompilationContext<DocCollectionItem>,
      file: VFile,
    ) => Awaitable<VFile | void>;
  };
}

export type PluginOption = Awaitable<
  Plugin | PluginOption[] | false | undefined
>;

export interface ServerContext {
  /**
   * the file watcher, by default all content files are watched, along with other files.
   *
   * make sure to filter when listening to events
   */
  watcher?: FSWatcher;
}

export interface CoreOptions {
  environment: string;
  configPath: string;
  outDir: string;

  extend?: (core: Core) => Core;
  plugins?: PluginOption[];
}

export interface EmitOptions {
  /**
   * filter the plugins to run emit
   */
  filterPlugin?: (plugin: Plugin) => boolean;
}

export const _Defaults = {
  configPath: 'source.config.ts',
  outDir: '.source',
};

async function getPlugins(pluginOptions: PluginOption[]): Promise<Plugin[]> {
  const plugins: Plugin[] = [];

  for await (const option of pluginOptions) {
    if (!option) continue;
    if (Array.isArray(option)) plugins.push(...(await getPlugins(option)));
    else plugins.push(option);
  }

  return plugins;
}

export function createCore(options: CoreOptions) {
  let config: LoadedConfig;
  let plugins: Plugin[];
  let workspaces: Core[];

  async function transformMetadata<T>(
    {
      collection,
      filePath,
      source,
    }: TransformOptions<DocCollectionItem | MetaCollectionItem>,
    data: unknown,
  ): Promise<T> {
    if (collection.schema) {
      data = await validate(
        collection.schema,
        data,
        { path: filePath, source },
        collection.type === 'doc'
          ? `invalid frontmatter in ${filePath}`
          : `invalid data in ${filePath}`,
      );
    }

    return data as T;
  }

  const core = {
    /**
     * Convenient cache store, reset when config changes
     */
    cache: new Map<string, unknown>(),
    async init({ config: newConfig }: { config: Awaitable<LoadedConfig> }) {
      config = await newConfig;
      this.cache.clear();
      plugins = await getPlugins([
        postprocessPlugin(),
        options.plugins,
        config.global.plugins,
      ]);

      for (const plugin of plugins) {
        const out = await plugin.config?.call(this.getPluginContext(), config);
        if (out) config = out;
      }

      workspaces = await Promise.all(
        Object.values(config.workspaces).map(async (workspace) => {
          const core = createCore(options);
          await core.init({ config: workspace.config });
          return core;
        }),
      );
    },
    getOptions() {
      return options;
    },
    getConfig(): LoadedConfig {
      return config;
    },
    /**
     * The file path of compiled config file, the file may not exist (e.g. on Vite, or still compiling)
     */
    getCompiledConfigPath(): string {
      return path.join(options.outDir, 'source.config.mjs');
    },
    getPlugins() {
      return plugins;
    },
    getPluginContext(): PluginContext {
      return {
        core: this,
        ...options,
      };
    },
    async initServer(server: ServerContext): Promise<void> {
      const ctx = this.getPluginContext();
      for (const plugin of plugins) {
        await plugin.configureServer?.call(ctx, server);
      }
      for (const workspace of workspaces) {
        await workspace.initServer(server);
      }
    },
    async emit({ filterPlugin = () => true }: EmitOptions = {}): Promise<
      EmitEntry[]
    > {
      const ctx = this.getPluginContext();
      const files = new Map<string, EmitEntry>();
      async function add(...v: Awaitable<EmitEntry[] | false>[]) {
        for (const li of await Promise.all(v)) {
          if (li === false) continue;
          for (const item of li) files.set(item.path, item);
        }
      }
      await add(
        ...plugins.map((plugin) => {
          if (!filterPlugin(plugin) || !plugin.emit) return false;

          return plugin.emit.call(ctx);
        }),
        ...workspaces.map((workspace) => workspace.emit({ filterPlugin })),
      );
      return Array.from(files.values());
    },
    async emitAndWrite(emitOptions?: EmitOptions): Promise<void> {
      const start = performance.now();
      const out = await this.emit(emitOptions);

      await Promise.all(
        out.map(async (entry) => {
          const file = path.join(options.outDir, entry.path);

          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, entry.content);
        }),
      );
      console.log(`[MDX] generated files in ${performance.now() - start}ms`);
    },

    async transformMeta(
      options: TransformOptions<MetaCollectionItem>,
      data: unknown,
    ): Promise<unknown> {
      const ctx = {
        ...this.getPluginContext(),
        ...options,
      };

      data = await transformMetadata(options, data);
      for (const plugin of plugins) {
        if (plugin.meta?.transform)
          data = (await plugin.meta.transform.call(ctx, data)) ?? data;
      }

      return data;
    },
    async transformFrontmatter(
      options: TransformOptions<DocCollectionItem>,
      data: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      const ctx = {
        ...this.getPluginContext(),
        ...options,
      };

      data = await transformMetadata(options, data);
      for (const plugin of plugins) {
        if (plugin.doc?.frontmatter)
          data = (await plugin.doc.frontmatter.call(ctx, data)) ?? data;
      }

      return data;
    },
    async transformVFile(
      options: TransformOptions<DocCollectionItem>,
      file: VFile,
    ): Promise<VFile> {
      const ctx = {
        ...this.getPluginContext(),
        ...options,
      };

      for (const plugin of plugins) {
        if (plugin.doc?.vfile)
          file = (await plugin.doc.vfile.call(ctx, file)) ?? file;
      }

      return file;
    },
  };

  if (options.extend) {
    return (options.extend as (v: typeof core) => typeof core)(core);
  }

  return core;
}

function postprocessPlugin(): Plugin {
  const LinkReferenceTypes = `{
  /**
   * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
   */
  extractedReferences: import("fumadocs-mdx").ExtractedReference[];
}`;

  return {
    'index-file': {
      generateTypeConfig() {
        const lines: string[] = [];
        lines.push('{');
        lines.push('  DocData: {');
        for (const collection of this.core.getConfig().collectionList) {
          let postprocessOptions: Partial<PostprocessOptions> | undefined;
          switch (collection.type) {
            case 'doc':
              postprocessOptions = collection.postprocess;
              break;
            case 'docs':
              postprocessOptions = collection.docs.postprocess;
              break;
          }

          if (postprocessOptions?.extractLinkReferences) {
            lines.push(ident(`${collection.name}: ${LinkReferenceTypes},`, 2));
          }
        }
        lines.push('  }');
        lines.push('}');
        return lines.join('\n');
      },
      serverOptions(options) {
        options.doc ??= {};
        options.doc.passthroughs ??= [];
        options.doc.passthroughs.push('extractedReferences');
      },
    },
  };
}

export type Core = ReturnType<typeof createCore>;
