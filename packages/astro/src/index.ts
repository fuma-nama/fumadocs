import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroConfig, AstroIntegration } from 'astro';
import type { FSWatcher, Plugin } from 'vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import type { SatteriResolvedOptions } from '@astrojs/markdown-satteri';
import {
  mdxToMdast,
  type HastPluginDefinition,
  type HastPluginEntry,
  type HastPluginInput,
  type MdastPluginDefinition,
  type MdastPluginEntry,
  type MdastPluginInput,
  type PluginFactoryContext,
} from 'satteri';
import { parse, type ImportDeclaration, type Node } from 'yuku-parser';
import { frontmatterModule } from '../../shared/frontmatter-code';
import { applySatteriPreset, type DefaultSatteriOptions } from '@fumadocs/satteri/preset';
import { remarkInclude } from '@fumadocs/satteri/remark-include';
import { remarkLlms, type LLMsOptions } from '@fumadocs/satteri/remark-llms';
import { islandPlugin } from './island-plugin';
import { dataKey, frontmatterQuery, hasFrontmatterCode } from './shared';
import { output } from './sitemap';
import type * as RuntimeConfig from 'virtual:fumadocs/config';

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
   * Module whose default export is the MDX components, like `./src/components/mdx.tsx`. The content renders as a React island with them. The `components` of `<Content />` render like in Astro MDX, without hydrating.
   *
   * When unset, it renders as Astro MDX, pass components to `<Content />` instead.
   */
  components?: string;

  /**
   * Enable `getText('processed')` on pages, `true` or the options of `remarkLLMs`.
   *
   * JSX elements are rendered by the MDX components, which define their Markdown form with `asMarkdown()`.
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

  /**
   * Add the date of the last commit to `page.data.lastModified`, from the git history of the content directory.
   *
   * @defaultValue false
   */
  lastModified?: boolean;
}

export interface CollectionConfig extends CollectionOptions {
  /** content directory, relative to the project root. Fumadocs only processes the MDX files in it */
  dir: string;
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
}

/** the `<code>` of code blocks is renamed in mdast, so the syntax highlighter of Astro skips them */
const hiddenCode = 'fumadocs-code';

const hideCode: MdastPluginDefinition = {
  name: 'fumadocs-astro-hide-code',
  code(node, ctx) {
    // `hName` of mdast-util-to-hast, not in the types of Sätteri
    const data = node.data as { hName?: string } | undefined;
    if (!data?.hName) ctx.setProperty(node, 'data', { ...data, hName: hiddenCode });
  },
};

const restoreCode: HastPluginDefinition = {
  name: 'fumadocs-astro-restore-code',
  element: {
    filter: [hiddenCode],
    visit(node, ctx) {
      ctx.replaceNode(node, {
        type: 'element',
        tagName: 'code',
        properties: node.properties,
        children: node.children,
      });
    },
  },
};

/**
 * The frontmatter in the code of a page, `export const frontmatter = {...}`, leaves the content, which has the
 * frontmatter export of Astro. Like Fumadocs MDX, it is a function of the params of a page as `props`.
 *
 * @param onModule - receives the module of the function
 */
function frontmatterCode(onModule?: (module: string) => void): MdastPluginInput {
  return ({ source }) => {
    if (!hasFrontmatterCode(source)) return;
    const imports: [ImportDeclaration, string][] = [];
    let done = false;

    return {
      name: 'fumadocs-astro-frontmatter-code',
      mdxjsEsm(node, ctx) {
        if (done) return;
        const { value } = node;
        const statements = parse(value, { lang: 'tsx' }).program.body;
        for (const statement of statements)
          if (statement.type === 'ImportDeclaration')
            imports.push([statement, value.slice(statement.start, statement.end)]);
        const frontmatter = frontmatterModule(value, statements, imports, (node: Node) => [
          node.start,
          node.end,
        ]);
        if (!frontmatter) return;
        onModule?.(frontmatter.module);
        const [start, end] = frontmatter.remove;
        ctx.setField(node, 'value', value.slice(0, start) + value.slice(end));
        done = true;
      },
    };
  };
}

/**
 * Register the outputs of a page with `pageOutputs` of the runtime, under a key in its frontmatter: rendering the
 * page imports its module.
 *
 * @param markdown - whether the page has the output of `remarkLlms()`
 */
function outputsPlugin(root: string, markdown: boolean, island?: string): HastPluginInput {
  return ({ fileURL }) =>
    fileURL && {
      name: 'fumadocs-astro-outputs',
      after(tree, ctx) {
        const key = path.relative(root, fileURLToPath(fileURL)).replaceAll(path.sep, '/');
        ctx.data.astro!.frontmatter[dataKey] = key;
        const { data } = ctx;
        const outputs = [
          `toc: ${data._rehypeTocCode ?? '() => []'}`,
          `structuredData: ${data._structuredDataCode ?? '() => ({ headings: [], contents: [] })'}`,
        ];
        if (markdown) outputs.push('markdown: _markdown');
        if (island) outputs.push('components: _components');
        // after the declaration of `_markdown`, in an export as ESM of MDX only has imports and exports
        ctx.appendChild(tree, {
          type: 'mdxjsEsm',
          value: `import { pageOutputs as _pageOutputs } from ${JSON.stringify(internalModule('mdx-runtime'))};
${island ? `import { components as _components } from ${JSON.stringify(island)};\n` : ''}export const _fumadocs = void _pageOutputs.set(${JSON.stringify(key)}, { ${outputs.join(', ')} });`,
        });
      },
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
  /** `remarkInclude()` of the project */
  include: MdastPluginEntry;
  /** the generated modules by ID */
  modules: Record<string, string>;
  runtime: typeof RuntimeConfig;
}

/**
 * The Astro integration of Fumadocs, it runs the MDX features of Fumadocs on the Sätteri processor of Astro.
 *
 * It adds the React and MDX integrations of Astro, unless they are already configured.
 */
export default function fumadocs({
  collections = { docs: { dir: 'content/docs' } },
  ...defaults
}: FumadocsOptions = {}): AstroIntegration {
  // kept across the config reloads of dev
  const includes = createIncludeTracker();

  return {
    name: '@fumadocs/astro',
    hooks: {
      async 'astro:config:setup'({ config, injectScript, updateConfig }) {
        const root = fileURLToPath(config.root);
        const context: SetupContext = {
          root,
          satteri: getSatteriOptions(config),
          include: remarkInclude({ cwd: root }),
          modules: {},
          runtime: { loaders: {}, root },
        };

        const resolved: ResolvedCollection[] = [];
        for (const [name, collection] of Object.entries(collections)) {
          resolved.push(await resolveCollection(name, { ...defaults, ...collection }, context));
        }
        const { modules, runtime } = context;
        modules['virtual:fumadocs/config'] = runtimeConfigModule(runtime);
        addCollectionPlugins(context.satteri, resolved, includes);

        // on every page, as persisted islands can move to pages without content
        injectScript(
          'page',
          `import { onBeforeSwap } from ${JSON.stringify(internalModule('navigation'))};
document.addEventListener('astro:before-swap', onBeforeSwap);`,
        );
        updateConfig({
          integrations: missingIntegrations(config.integrations),
          vite: {
            plugins: [virtualPlugin(modules), frontmatterPlugin(), includes.plugin()],
            optimizeDeps: { exclude: ['@fumadocs/astro'] },
            ssr: { noExternal: ['@fumadocs/astro'] },
          },
        });
      },
      'astro:config:done'({ config }) {
        output.base = config.base.replace(/\/$/, '');
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
    lastModified,
    ...options
  }: CollectionConfig,
  { root, satteri, include, modules, runtime }: SetupContext,
): Promise<ResolvedCollection> {
  runtime.loaders[name] = { dir, extractLinkReferences, lastModified };
  let island: string | undefined;
  if (components) {
    island = `virtual:fumadocs/island/${name}`;
    modules[island] = islandModule(root, components);
  }
  const llms = includeProcessedMarkdown === true ? {} : includeProcessedMarkdown || undefined;
  const preset = await applySatteriPreset({
    ...options,
    features: satteri.features,
    remarkImageOptions: false,
    // the code of structured data that reads the props of a page
    remarkStructureOptions: options.remarkStructureOptions !== false && {
      ...options.remarkStructureOptions,
      exportAs: true,
    },
    // titles stay text for islands
    rehypeTocOptions: { exportToc: { as: 'data' } },
  })('bundler');

  return {
    dir: realPath(path.resolve(root, dir)),
    mdastPlugins: [
      frontmatterCode(),
      include,
      preset.mdastPlugins,
      llms && remarkLlms({ ...llms, as: '_markdown' }),
      hideCode,
    ],
    // the island plugin has the state of a file
    hastPlugins: [
      restoreCode,
      preset.hastPlugins,
      outputsPlugin(root, llms !== undefined, island),
      island !== undefined && (() => islandPlugin(island, internalModule('mdx-runtime'))),
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
function runtimeConfigModule(runtime: typeof RuntimeConfig): string {
  let code = '';
  for (const [key, value] of Object.entries(runtime)) {
    code += `export const ${key} = ${JSON.stringify(value)};\n`;
  }
  return code;
}

/** the frontmatter in code of an MDX file as a module, `frontmatter` is `undefined` without it */
function frontmatterPlugin(): Plugin {
  return {
    name: '@fumadocs/astro:frontmatter',
    load: {
      filter: { id: new RegExp(`${frontmatterQuery.replace(/[?.]/g, '\\$&')}$`) },
      async handler(id) {
        let module = 'export const frontmatter = undefined;';
        mdxToMdast(await fs.promises.readFile(id.slice(0, -frontmatterQuery.length), 'utf8'), {
          features: { frontmatter: true },
          position: false,
          mdastPlugins: [frontmatterCode((code) => (module = code))],
        });
        return module;
      },
    },
    // in dev, a change of a file that the frontmatter in code imports loads its page again
    hotUpdate({ file, modules, server }) {
      const visited = new Set(modules);
      for (const item of visited) {
        if (item.id?.endsWith(frontmatterQuery)) {
          if (item.file !== file) server.watcher.emit('change', item.file);
        } else for (const importer of item.importers) visited.add(importer);
      }
    },
  };
}

/** the content island of the MDX components */
function islandModule(root: string, components: string): string {
  return `import components from ${userModule(root, components)};
import { createIsland } from ${JSON.stringify(internalModule('island'))};
export const FumadocsIsland = createIsland(components);
export { components };`;
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
