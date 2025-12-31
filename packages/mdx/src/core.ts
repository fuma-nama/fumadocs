import type {
  CollectionItem,
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

export interface PluginContext {
  core: Core;
}

export type CompilationContext<Collection> = PluginContext & TransformOptions<Collection>;

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
  config?: (this: PluginContext, config: LoadedConfig) => Awaitable<void | LoadedConfig>;

  /**
   * Generate files (e.g. types, index file, or JSON schemas)
   */
  emit?: (this: PluginContext) => Awaitable<EmitEntry[]>;

  /**
   * Configure Fumadocs dev server
   */
  configureServer?: (this: PluginContext, server: ServerContext) => Awaitable<void>;

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
    vfile?: (this: CompilationContext<DocCollectionItem>, file: VFile) => Awaitable<VFile | void>;
  };
}

export type PluginOption = Awaitable<Plugin | PluginOption[] | false | undefined>;

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
  plugins?: PluginOption[];

  /**
   * the workspace info if this instance is created as a workspace
   */
  workspace?: {
    parent: Core;
    name: string;
    dir: string;
  };
}

export interface EmitOptions {
  /**
   * filter the plugins to run emit
   */
  filterPlugin?: (plugin: Plugin) => boolean;

  /**
   * filter the workspaces to run emit
   */
  filterWorkspace?: (workspace: string) => boolean;

  /**
   * write files
   */
  write?: boolean;
}

export interface EmitOutput {
  entries: EmitEntry[];
  workspaces: Record<string, EmitEntry[]>;
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
  const workspaces = new Map<string, Core>();

  async function transformMetadata<T>(
    { collection, filePath, source }: TransformOptions<DocCollectionItem | MetaCollectionItem>,
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

  return {
    /**
     * Convenient cache store, reset when config changes
     */
    cache: new Map<string, unknown>(),
    async init({ config: newConfig }: { config: Awaitable<LoadedConfig> }) {
      config = await newConfig;
      this.cache.clear();
      workspaces.clear();
      plugins = await getPlugins([postprocessPlugin(), options.plugins, config.global.plugins]);

      for (const plugin of plugins) {
        const out = await plugin.config?.call(this.getPluginContext(), config);
        if (out) config = out;
      }

      // only support workspaces with max depth 1
      if (!options.workspace) {
        await Promise.all(
          Object.entries(config.workspaces).map(async ([name, workspace]) => {
            const core = createCore({
              ...options,
              outDir: path.join(options.outDir, name),
              workspace: {
                name,
                parent: this,
                dir: workspace.dir,
              },
            });
            await core.init({ config: workspace.config });
            workspaces.set(name, core);
          }),
        );
      }
    },
    getWorkspaces() {
      return workspaces;
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
    getCollections(): CollectionItem[] {
      return Array.from(config.collections.values());
    },
    getCollection(name: string): CollectionItem | undefined {
      return config.collections.get(name);
    },
    getPluginContext(): PluginContext {
      return {
        core: this,
      };
    },
    async initServer(server: ServerContext): Promise<void> {
      const ctx = this.getPluginContext();
      for (const plugin of plugins) {
        await plugin.configureServer?.call(ctx, server);
      }
      for (const workspace of workspaces.values()) {
        await workspace.initServer(server);
      }
    },
    async emit(emitOptions: EmitOptions = {}): Promise<EmitOutput> {
      const { filterPlugin, filterWorkspace, write = false } = emitOptions;
      const start = performance.now();
      const ctx = this.getPluginContext();
      const added = new Set<string>();
      const out: EmitOutput = {
        entries: [],
        workspaces: {},
      };

      for (const li of await Promise.all(
        plugins.map((plugin) => {
          if ((filterPlugin && !filterPlugin(plugin)) || !plugin.emit) return;
          return plugin.emit.call(ctx);
        }),
      )) {
        if (!li) continue;
        for (const item of li) {
          if (added.has(item.path)) continue;
          out.entries.push(item);
          added.add(item.path);
        }
      }

      if (write) {
        await Promise.all(
          out.entries.map(async (entry) => {
            const file = path.join(options.outDir, entry.path);

            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, entry.content);
          }),
        );

        console.log(
          options.workspace
            ? `[MDX: ${options.workspace.name}] generated files in ${performance.now() - start}ms`
            : `[MDX] generated files in ${performance.now() - start}ms`,
        );
      }

      for (const [name, workspace] of workspaces) {
        if (filterWorkspace && !filterWorkspace(name)) continue;
        out.workspaces[name] = (await workspace.emit(emitOptions)).entries;
      }

      return out;
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
        if (plugin.meta?.transform) data = (await plugin.meta.transform.call(ctx, data)) ?? data;
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
        if (plugin.doc?.frontmatter) data = (await plugin.doc.frontmatter.call(ctx, data)) ?? data;
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
        if (plugin.doc?.vfile) file = (await plugin.doc.vfile.call(ctx, file)) ?? file;
      }

      return file;
    },
  };
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
        for (const collection of this.core.getCollections()) {
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
