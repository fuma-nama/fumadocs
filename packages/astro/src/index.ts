import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroConfig, AstroIntegration, HookParameters } from 'astro';
import type { ComponentType, ReactNode } from 'react';
import type { Connect, DevEnvironment, FSWatcher, Plugin, RunnableDevEnvironment } from 'vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import type { SatteriResolvedOptions } from '@astrojs/markdown-satteri';
import type {
  HastPluginDefinition,
  HastPluginEntry,
  MdastPluginDefinition,
  MdastPluginEntry,
  PluginFactoryContext,
} from 'satteri';
import { applySatteriPreset, type DefaultSatteriOptions } from '@fumadocs/satteri/preset';
import { remarkInclude } from '@fumadocs/satteri/remark-include';
import { remarkLlms, type LLMsOptions } from '@fumadocs/satteri/remark-llms';
import type { UseSearchReturn } from 'fumadocs-core/search/client';
import type { SharedProps as SearchDialogProps } from 'fumadocs-ui/components/dialog/search';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { islandPlugin } from './island-plugin';
import { dataKey, trimSlash, type FumadocsData } from './shared';
import { output } from './sitemap';
import type * as AppModule from './app';

export { serializeSitemap } from './sitemap';

export interface CollectionOptions extends Pick<
  DefaultSatteriOptions,
  | 'mdastPlugins'
  | 'hastPlugins'
  | 'remarkHeadingOptions'
  | 'remarkCodeTabOptions'
  | 'remarkNpmOptions'
  | 'remarkStructureOptions'
  | 'rehypeCodeOptions'
  | 'rehypeKatexOptions'
> {
  /**
   * Module whose default export is the MDX components, like `./src/components/mdx.tsx`. The content renders as a React island with them.
   *
   * When unset, it renders as Astro MDX, pass components to `<Content />` instead.
   */
  components?: string;

  /**
   * Enable `getText('processed')` on pages, `true` or the options of `remarkLLMs`.
   *
   * With `output: 'function'`, JSX elements are rendered by the MDX components, which define their Markdown form with `asMarkdown()`.
   *
   * @defaultValue false
   */
  includeProcessedMarkdown?: boolean | Omit<LLMsOptions, 'as'>;

  /**
   * Add the links of pages to `page.data.extractedReferences`, like for a graph view.
   *
   * @defaultValue false
   */
  extractLinkReferences?: boolean;
}

export interface CollectionConfig extends CollectionOptions {
  /** content directory, relative to the project root. Fumadocs only processes the MDX files in it */
  dir: string;
}

/** the exports of the `layout` module */
export interface LayoutModule {
  /** the options of Fumadocs UI layouts */
  baseOptions?: (locale?: string) => BaseLayoutProps;
  /** wraps the children of the root provider in layouts, for UI on every page like WebMCP */
  Provider?: ComponentType<{ children: ReactNode }>;
  /** your own search dialog, it replaces the built-in search index */
  SearchDialog?: ComponentType<SearchDialogProps>;
  /** the search hook of the built-in dialog like `useAlgoliaSearch()`, it replaces the built-in search index */
  useSearch?: (options: { locale?: string }) => UseSearchReturn;
}

export interface FumadocsOptions extends CollectionOptions {
  /**
   * The content collections of Fumadocs, `pageLoader()` and `metaLoader()` load them by name.
   *
   * The other options of the integration are the defaults of collections.
   *
   * @defaultValue `{ docs: { dir: 'content/docs' } }`
   */
  collections?: Record<string, CollectionConfig>;

  /**
   * Module of the {@link LayoutModule}, it loads on every page. Requires `src/fumadocs.config.ts`.
   *
   * Exporting `useSearch` or `SearchDialog` replaces the built-in search index, add `oramaSearchPlugin()` to keep it.
   */
  layout?: string;

  /**
   * Module whose default export is the React component of docs pages, receiving `DocsPageProps`. Requires `src/fumadocs.config.ts`.
   */
  page?: string;

  /**
   * The global CSS of Fumadocs pages, like your Tailwind CSS file. Requires `src/fumadocs.config.ts`.
   *
   * @defaultValue `src/styles/global.css` when it exists
   */
  css?: string;
}

/** `virtual:fumadocs/config`, values of the build for the runtime */
export interface RuntimeConfig {
  /** by collection, for `pageLoader()` and `metaLoader()` */
  loaders: Record<string, Pick<CollectionConfig, 'dir' | 'extractLinkReferences'>>;
  /** the root directory of the project */
  root: string;
  srcDir: string;
  publicDir: string;
  /** has an adapter, routes can render on request */
  server: boolean;
  /** `output: 'server'`, pages render on request */
  onDemand: boolean;
}

/** the default `components` module */
const defaultComponents = 'fumadocs-ui/mdx';

/** code blocks are renamed in mdast, so the syntax highlighter of Astro skips them */
const hiddenPre = 'fumadocs-pre';

const hideCode: MdastPluginDefinition = {
  name: 'fumadocs-astro-hide-code',
  code(node, ctx) {
    // `hName` of mdast-util-to-hast, not in the types of Sätteri
    const data = node.data as { hName?: string } | undefined;
    if (!data?.hName) ctx.setProperty(node, 'data', { ...data, hName: hiddenPre });
  },
};

const restoreCode: HastPluginDefinition = {
  name: 'fumadocs-astro-restore-code',
  element: {
    filter: [hiddenPre],
    visit(node, ctx) {
      ctx.replaceNode(node, {
        type: 'element',
        tagName: 'pre',
        properties: node.properties,
        children: node.children,
      });
    },
  },
};

const exportData: HastPluginDefinition = {
  name: 'fumadocs-astro-data',
  after(_root, ctx) {
    ctx.data.astro!.frontmatter[dataKey] = {
      toc: ctx.data.rehypeToc ?? [],
      structuredData: ctx.data.structuredData ?? { headings: [], contents: [] },
      markdown: ctx.data.markdown,
      markdownId: ctx.data._markdownId,
    } satisfies FumadocsData;
  },
};

declare module 'satteri' {
  interface DataMap {
    /** the key of the function output in `registerMarkdown()` */
    _markdownId?: string;
  }
}

/** register the function output of `remarkLlms()` for `getText('processed')`, with the MDX components of the island */
function registerMarkdownPlugin(root: string, island?: string): MdastPluginEntry {
  return ({ fileURL }) => {
    if (!fileURL) return;
    const file = path.relative(root, fileURLToPath(fileURL)).replaceAll(path.sep, '/');
    return {
      name: 'fumadocs-astro-markdown',
      after(tree, ctx) {
        ctx.data._markdownId = file;
        ctx.prependChild(tree, {
          type: 'mdxjsEsm',
          value: `import { registerMarkdown as _registerMarkdown } from ${JSON.stringify(internalModule('mdx-runtime'))};
${island ? `import { components as _components } from ${JSON.stringify(island)};\n` : ''}export const _fumadocsMarkdown = _registerMarkdown(${JSON.stringify(file)}, _markdown${island ? ', _components' : ''});`,
        });
      },
    };
  };
}

/** a collection with its Sätteri plugins */
interface ResolvedCollection {
  /** the real path of its content directory */
  dir: string;
  mdastPlugins: MdastPluginEntry[];
  hastPlugins: HastPluginEntry[];
}

/** the values of `astro:config:setup` for its helpers */
interface SetupContext {
  root: string;
  satteri: SatteriResolvedOptions;
  /** the runtime of `fumadocs.config.ts`, when it exists */
  appModule?: string;
  /** `remarkInclude()` of the project */
  include: MdastPluginEntry;
  /** the generated modules by ID */
  modules: Record<string, string>;
  runtime: RuntimeConfig;
}

/**
 * The Astro integration of Fumadocs, it runs the MDX features of Fumadocs on the Sätteri processor of Astro.
 *
 * It adds the React and MDX integrations of Astro, unless they are already configured.
 */
export default function fumadocs({
  collections = { docs: { dir: 'content/docs' } },
  layout,
  page,
  css,
  ...defaults
}: FumadocsOptions = {}): AstroIntegration {
  // kept across the config reloads of dev
  const includes = createIncludeTracker();
  let hasConfig = false;

  return {
    name: '@fumadocs/astro',
    hooks: {
      async 'astro:config:setup'(params) {
        const { config } = params;
        const root = fileURLToPath(config.root);
        const srcDir = fileURLToPath(config.srcDir);
        const appFile = resolveConfigFile(srcDir);
        hasConfig = appFile !== undefined;
        const context: SetupContext = {
          root,
          satteri: getSatteriOptions(config),
          appModule: appFile && internalModule('app'),
          include: remarkInclude({ cwd: root }),
          modules: {
            // for the React bodies and the UI of plugins
            'virtual:fumadocs/components': `export { default as components } from ${userModule(root, defaults.components ?? defaultComponents)};`,
          },
          runtime: {
            loaders: {},
            root,
            srcDir,
            publicDir: fileURLToPath(config.publicDir),
            server: config.adapter !== undefined,
            onDemand: config.output === 'server',
          },
        };

        const resolved: ResolvedCollection[] = [];
        for (const [name, collection] of Object.entries(collections)) {
          resolved.push(await resolveCollection(name, { ...defaults, ...collection }, context));
        }
        const { modules, runtime, appModule } = context;
        modules['virtual:fumadocs/config'] = runtimeConfigModule(runtime);
        if (appFile) {
          Object.assign(
            modules,
            appModules(appFile, context, { components: defaults.components, layout, page, css }),
          );
          injectRoutes(params, runtime);
        }
        addCollectionPlugins(context.satteri, resolved, includes);

        // on every page, as persisted islands can move to pages without content
        params.injectScript(
          'page',
          `import { onBeforeSwap } from ${JSON.stringify(internalModule('navigation'))};
document.addEventListener('astro:before-swap', onBeforeSwap);`,
        );
        params.updateConfig({
          integrations: missingIntegrations(config.integrations),
          vite: {
            plugins: [
              virtualPlugin(modules),
              includes.plugin(),
              appModule !== undefined &&
                config.trailingSlash !== 'ignore' &&
                trailingSlashPlugin(config.trailingSlash, appModule),
              appModule !== undefined && contentReloadPlugin(appModule, resolved),
            ],
            optimizeDeps: { exclude: ['@fumadocs/astro'] },
            ssr: { noExternal: ['@fumadocs/astro'] },
          },
        });
      },
      'astro:config:done'({ config, injectTypes }) {
        output.base = config.base.replace(/\/$/, '');
        if (!hasConfig) return;
        // `.astro` components in `fumadocs.config.ts`, for `tsc` without the language tools of Astro
        injectTypes({
          filename: 'astro-modules.d.ts',
          content: `declare module '*.astro' {
  const component: import('astro/runtime/server/index.js').AstroComponentFactory;
  export default component;
}`,
        });
      },
      // before `astro:build:done` of every integration, like the sitemap
      'astro:build:generated'({ dir }) {
        output.dir = fileURLToPath(dir);
      },
    },
  };
}

/** Fumadocs runs on the Sätteri processor of Astro */
function getSatteriOptions({ markdown: { processor } }: AstroConfig): SatteriResolvedOptions {
  if (processor.name !== 'satteri')
    throw new Error(
      `Fumadocs needs the Sätteri Markdown processor of Astro, but \`markdown.processor\` is "${processor.name}".`,
    );
  return processor.options as SatteriResolvedOptions;
}

function missingIntegrations(integrations: AstroIntegration[]): AstroIntegration[] {
  const out: AstroIntegration[] = [];
  if (!integrations.some((item) => item.name === '@astrojs/react')) out.push(react());
  if (!integrations.some((item) => item.name === '@astrojs/mdx')) out.push(mdx());
  return out;
}

/** the plugins of a collection over the defaults, its loader options and island module go to the context */
async function resolveCollection(
  name: string,
  {
    dir,
    components,
    includeProcessedMarkdown,
    extractLinkReferences,
    ...options
  }: CollectionConfig,
  { root, satteri, appModule, include, modules, runtime }: SetupContext,
): Promise<ResolvedCollection> {
  runtime.loaders[name] = { dir, extractLinkReferences };
  let island: string | undefined;
  if (components || appModule) {
    island = `virtual:fumadocs/island/${name}`;
    modules[island] = islandModule(root, components, appModule !== undefined);
  }
  const llms = includeProcessedMarkdown === true ? {} : includeProcessedMarkdown || undefined;
  const preset = await applySatteriPreset({
    ...options,
    features: satteri.features,
    remarkImageOptions: false,
    remarkStructureOptions: options.remarkStructureOptions !== false && {
      ...options.remarkStructureOptions,
      exportAs: false,
    },
    rehypeTocOptions: { exportToc: { as: 'data' } },
  })('bundler');

  return {
    dir: realPath(path.resolve(root, dir)),
    mdastPlugins: [
      include,
      preset.mdastPlugins,
      llms?.output === 'function'
        ? [remarkLlms({ ...llms, as: '_markdown' }), registerMarkdownPlugin(root, island)]
        : llms && remarkLlms({ ...llms, as: '' }),
      hideCode,
    ],
    // the island plugin has the state of a file
    hastPlugins: [
      restoreCode,
      preset.hastPlugins,
      exportData,
      island !== undefined &&
        (() => islandPlugin(island, internalModule('mdx-runtime'), appModule !== undefined)),
    ],
  };
}

/** run the plugins of collections on their MDX files, the Markdown pipeline of Astro renders `.md` into HTML, which can't have components */
function addCollectionPlugins(
  satteri: SatteriResolvedOptions,
  collections: ResolvedCollection[],
  includes: IncludeTracker,
) {
  function collectionOf({ fileURL, sourceFormat }: PluginFactoryContext) {
    if (!fileURL || sourceFormat !== 'mdx') return;
    const file = fileURLToPath(fileURL);
    const collection = collections.find(({ dir }) => isInside(dir, file));
    return collection && { file, collection };
  }

  satteri.mdastPlugins.push((ctx) => {
    const match = collectionOf(ctx);
    if (!match) return;
    ctx.data._compiler = { addDependency: (dependency) => includes.add(dependency, match.file) };
    return match.collection.mdastPlugins;
  });
  satteri.hastPlugins.push((ctx) => collectionOf(ctx)?.collection.hastPlugins);
}

/** `virtual:fumadocs/config` */
function runtimeConfigModule(runtime: RuntimeConfig): string {
  let code = '';
  for (const [key, value] of Object.entries(runtime)) {
    code += `export const ${key} = ${JSON.stringify(value)};\n`;
  }
  return code;
}

/** the content island of the MDX components, `managed` with the providers of Fumadocs pages */
function islandModule(root: string, components = defaultComponents, managed: boolean): string {
  const [create, module] = managed
    ? ['createContentIsland', 'ui/content']
    : ['createIsland', 'island'];
  return `import components from ${userModule(root, components)};
import { ${create} } from ${JSON.stringify(internalModule(module))};
export const FumadocsIsland = ${create}(components);
export { components };`;
}

const layoutExports = [
  'baseOptions',
  'Provider',
  'SearchDialog',
  'useSearch',
] satisfies (keyof LayoutModule)[];

/** the modules of `fumadocs.config.ts` and the managed UI */
function appModules(
  appFile: string,
  { root, runtime: { srcDir } }: SetupContext,
  {
    components,
    layout,
    page,
    css,
  }: Pick<FumadocsOptions, 'components' | 'layout' | 'page' | 'css'>,
): Record<string, string> {
  const globalCss = path.join(srcDir, 'styles/global.css');
  let cssModule = '';
  if (css) cssModule = `import ${userModule(root, css)};`;
  else if (fs.existsSync(globalCss))
    cssModule = `import ${JSON.stringify(globalCss.replaceAll(path.sep, '/'))};`;

  return {
    'virtual:fumadocs/app': `export { default } from ${JSON.stringify(appFile)};`,
    // the content island of React bodies from plugins
    'virtual:fumadocs/island': islandModule(root, components, true),
    // a namespace, as the exports are optional
    'virtual:fumadocs/layout': layout
      ? `import * as layout from ${userModule(root, layout)};
export const { ${layoutExports.join(', ')} } = { ...layout };`
      : `export const { ${layoutExports.join(', ')} } = {};`,
    'virtual:fumadocs/page': page
      ? `export { default } from ${userModule(root, page)};`
      : 'export default undefined;',
    'virtual:fumadocs/css': cssModule,
  };
}

/** the managed routes, the pages and files of the config can be at any path */
function injectRoutes(
  { injectRoute, addMiddleware }: HookParameters<'astro:config:setup'>,
  { srcDir, server, onDemand }: RuntimeConfig,
) {
  const route = (pattern: string, file: string, prerender = true) =>
    injectRoute({ pattern, entrypoint: new URL(`./routes/${file}`, import.meta.url), prerender });

  // with `output: 'server'`, pages render on request like other Astro pages
  if (!onDemand) route('[...fumadocsPage]', 'page.astro');
  route('[...fumadocsFile]', 'file.js');
  // routes rendered on request, Astro tries the prerendered routes of a pattern first
  if (server) route('[...fumadocsServer]', 'server.astro', false);
  addMiddleware({ order: 'pre', entrypoint: new URL('./routes/middleware.js', import.meta.url) });

  const pages = path.join(srcDir, 'pages');
  if (!['astro', 'md', 'mdx', 'html'].some((ext) => fs.existsSync(path.join(pages, `404.${ext}`))))
    route('404', '404.astro');
}

/** in dev, a change of an included file updates the MDX files including it */
function createIncludeTracker() {
  // included files -> the MDX files including them
  const dependents = new Map<string, Set<string>>();
  let watcher: FSWatcher | undefined;

  return {
    /** `file` includes `dependency` */
    add(dependency: string, file: string) {
      let files = dependents.get(dependency);
      if (!files) {
        dependents.set(dependency, (files = new Set()));
        watcher?.add(dependency);
      }
      files.add(file);
    },
    plugin(): Plugin {
      return {
        name: '@fumadocs/astro:include',
        configureServer(server) {
          watcher = server.watcher;
          watcher.add([...dependents.keys()]);
          // files can include themselves or each other, each updates once per change
          const updating = new Set<string>();
          watcher.on('change', (file) => {
            if (updating.has(file)) return;
            updating.add(file);
            try {
              for (const dependent of dependents.get(file) ?? []) {
                server.watcher.emit('change', dependent);
              }
            } finally {
              updating.delete(file);
            }
          });
        },
      };
    },
  };
}

type IncludeTracker = ReturnType<typeof createIncludeTracker>;

/** the environment where Astro renders routes in dev, it can import modules */
function isRunnable(
  environment: DevEnvironment | undefined,
): environment is RunnableDevEnvironment {
  return environment !== undefined && 'runner' in environment;
}

/**
 * In dev, files of runtime content sources (like `@fumadocs/local-md`) aren't modules, a change reloads the pages to read them again.
 *
 * Collections are left to Astro, which reloads their content itself.
 */
function contentReloadPlugin(appModule: string, collections: ResolvedCollection[]): Plugin {
  return {
    name: '@fumadocs/astro:content-reload',
    configureServer(server) {
      const { ssr, client } = server.environments;
      if (!isRunnable(ssr)) return;
      const onFile = async (file: string) => {
        if (ssr.moduleGraph.getModulesByFile(file)?.size) return;
        if (collections.some(({ dir }) => isInside(dir, file))) return;
        const { app } = await ssr.runner.import<typeof AppModule>(appModule);
        for (const page of app.getPages()) {
          if (!page.absolutePath || !isInside(path.dirname(page.absolutePath), file)) continue;
          ssr.hot.send({ type: 'full-reload' });
          client?.hot.send({ type: 'full-reload' });
          return;
        }
      };

      const listener = (file: string) => void onFile(file).catch(() => undefined);
      server.watcher.on('add', listener);
      server.watcher.on('change', listener);
      server.watcher.on('unlink', listener);
    },
  };
}

/**
 * In dev, the file routes like `/api/search` match with or without the trailing slash, as their files do in builds.
 *
 * The dev server of Astro rejects other forms than `trailingSlash` before routing, so the URL is rewritten before it.
 */
function trailingSlashPlugin(
  trailingSlash: Exclude<AstroConfig['trailingSlash'], 'ignore'>,
  appModule: string,
): Plugin {
  return {
    name: '@fumadocs/astro:trailing-slash',
    configureServer(server) {
      const { ssr } = server.environments;
      if (!isRunnable(ssr)) return;
      let routes: AppModule.Route[] | undefined;
      let urls = new Set<string>();
      const getUrls = async () => {
        const list = await (await ssr.runner.import<typeof AppModule>(appModule)).getRoutes();
        if (list === routes) return urls;
        routes = list;
        urls = new Set();
        for (const route of list) if (route.type === 'file') urls.add(trimSlash(route.url));
        return urls;
      };

      const handle: Connect.NextHandleFunction = (req, _res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const { pathname } = url;
        if (pathname.endsWith('/') === (trailingSlash === 'always') || pathname.startsWith('/@'))
          return next();
        getUrls()
          .then((files) => {
            // encoded like the URLs of routes
            if (!files.has(trimSlash(pathname))) return;
            req.url =
              (trailingSlash === 'always' ? `${pathname}/` : pathname.slice(0, -1)) + url.search;
          })
          // the route renders the error
          .catch(() => undefined)
          .finally(next);
      };
      // Astro adds its middlewares to the front of the stack after the other plugins, this goes before them
      return () => {
        server.middlewares.stack.unshift({ route: '', handle });
      };
    },
  };
}

function isInside(dir: string, file: string): boolean {
  const relative = path.relative(dir, file);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/** content can be in a symlinked directory, MDX files are resolved to their real paths */
function realPath(file: string): string {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}

/** resolved from the project rather than this package */
function userModule(root: string, file: string): string {
  return JSON.stringify(
    file.startsWith('.') ? path.resolve(root, file).replaceAll(path.sep, '/') : file,
  );
}

/** the runtime config, its routes and UI are managed by Fumadocs */
function resolveConfigFile(srcDir: string): string | undefined {
  for (const ext of ['ts', 'tsx', 'js', 'mjs']) {
    const candidate = path.join(srcDir, `fumadocs.config.${ext}`);
    if (fs.existsSync(candidate)) return candidate.replaceAll(path.sep, '/');
  }
}

/** a module of this package for the generated code, not a public export */
function internalModule(name: string): string {
  return fileURLToPath(new URL(`./${name}.js`, import.meta.url)).replaceAll(path.sep, '/');
}

/** the islands are hydrated by their IDs, Astro doesn't support the `\0` prefix of virtual modules there */
function virtualPlugin(modules: Record<string, string>): Plugin {
  const filter = { id: /^virtual:fumadocs\// };

  return {
    name: '@fumadocs/astro:virtual',
    resolveId: {
      filter,
      handler: (id) => (id in modules ? id : undefined),
    },
    load: {
      filter,
      handler: (id) => modules[id],
    },
  };
}
