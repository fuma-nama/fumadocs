import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import type { SatteriResolvedOptions } from '@astrojs/markdown-satteri';
import type { HastPluginDefinition, MdastPluginDefinition, PluginFactoryContext } from 'satteri';
import { applySatteriPreset, type DefaultSatteriOptions } from '@fumadocs/satteri/preset';
import { remarkInclude } from '@fumadocs/satteri/remark-include';
import { remarkLlms } from '@fumadocs/satteri/remark-llms';
import { islandPlugin } from './island-plugin';
import { dataKey, type FumadocsData } from './shared';

export interface FumadocsOptions extends Pick<
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
   * Module whose default export is the MDX components, like `./src/components/mdx.tsx`.
   */
  components: string;

  /**
   * The content collections of Fumadocs, `pageLoader()` and `metaLoader()` load them by name.
   *
   * @defaultValue `{ docs: { dir: 'content/docs' } }`
   */
  collections?: Record<string, CollectionOptions>;

  /**
   * Enable `getText('processed')` on pages.
   *
   * @defaultValue false
   */
  includeProcessedMarkdown?: boolean;
}

export interface CollectionOptions {
  /**
   * Content directory, relative to the project root. Fumadocs only processes the MDX files in it.
   */
  dir: string;

  /**
   * Module whose default export is the MDX components, defaults to the `components` of the integration.
   */
  components?: string;
}

/** code blocks are renamed in mdast, so the syntax highlighter of Astro skips them */
const hiddenPre = 'fumadocs-pre';

const hideCode: MdastPluginDefinition = {
  name: 'fumadocs-astro-hide-code',
  code(node, ctx) {
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
    } satisfies FumadocsData;
  },
};

/**
 * The Astro integration of Fumadocs, it runs the MDX features of Fumadocs on the Sätteri processor of Astro.
 *
 * It adds the React and MDX integrations of Astro, unless they are already configured.
 */
export default function fumadocs({
  components,
  collections = { docs: { dir: 'content/docs' } },
  includeProcessedMarkdown = false,
  ...options
}: FumadocsOptions): AstroIntegration {
  return {
    name: '@fumadocs/astro',
    hooks: {
      async 'astro:config:setup'({ config, updateConfig, injectScript }) {
        const { processor } = config.markdown;
        if (processor.name !== 'satteri') {
          throw new Error(
            `Fumadocs needs the Sätteri Markdown processor of Astro, but \`markdown.processor\` is "${processor.name}".`,
          );
        }

        const names = new Set(config.integrations.map((integration) => integration.name));
        const integrations: AstroIntegration[] = [];
        if (!names.has('@astrojs/react')) integrations.push(react());
        if (!names.has('@astrojs/mdx')) integrations.push(mdx());

        const root = fileURLToPath(config.root);
        const islandFile = internalModule('island');
        const modules: Record<string, string> = {
          'virtual:fumadocs/config': `export const collections = ${JSON.stringify(collections)};`,
        };
        const resolved: { dir: string; island: string }[] = [];
        for (const [name, collection] of Object.entries(collections)) {
          const id = `virtual:fumadocs/island/${name}`;
          // resolved from the project rather than this package
          const specifier = collection.components ?? components;
          modules[id] = `import components from ${JSON.stringify(
            specifier.startsWith('.')
              ? path.resolve(root, specifier).replaceAll(path.sep, '/')
              : specifier,
          )};
import { createIsland } from ${JSON.stringify(islandFile)};
export const FumadocsIsland = createIsland(components);`;
          resolved.push({ dir: path.resolve(root, collection.dir), island: id });
        }

        const satteri = processor.options as SatteriResolvedOptions;
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

        // the Markdown pipeline of Astro renders `.md` into HTML, which can't have components
        const collectionOf = ({ fileURL, sourceFormat }: PluginFactoryContext) => {
          if (!fileURL || sourceFormat !== 'mdx') return;
          const file = fileURLToPath(fileURL);
          return resolved.find(({ dir }) => {
            const relative = path.relative(dir, file);
            return !relative.startsWith('..') && !path.isAbsolute(relative);
          });
        };

        satteri.mdastPlugins.push(
          (ctx) =>
            collectionOf(ctx) !== undefined && [
              remarkInclude({ cwd: root }),
              ...preset.mdastPlugins!,
              includeProcessedMarkdown && remarkLlms({ as: '' }),
              hideCode,
            ],
        );
        satteri.hastPlugins.push((ctx) => {
          const collection = collectionOf(ctx);
          return (
            collection !== undefined && [
              restoreCode,
              ...preset.hastPlugins!,
              exportData,
              islandPlugin(collection.island),
            ]
          );
        });

        // on every page, as persisted islands can move to pages without content
        injectScript(
          'page',
          `import { onBeforeSwap } from ${JSON.stringify(internalModule('navigation'))};
document.addEventListener('astro:before-swap', onBeforeSwap);`,
        );
        updateConfig({
          integrations,
          vite: {
            plugins: [virtualPlugin(modules)],
            optimizeDeps: { exclude: ['@fumadocs/astro'] },
            ssr: { noExternal: ['@fumadocs/astro'] },
          },
        });
      },
    },
  };
}

/** a module of this package for the generated code, not a public export */
function internalModule(name: string): string {
  return fileURLToPath(new URL(`./${name}.js`, import.meta.url)).replaceAll(path.sep, '/');
}

/** the islands are hydrated by their IDs, Astro doesn't support the `\0` prefix of virtual modules there */
function virtualPlugin(modules: Record<string, string>) {
  const filter = { id: /^virtual:fumadocs\// };

  return {
    name: '@fumadocs/astro:virtual',
    resolveId: {
      filter,
      handler: (id: string) => (id in modules ? id : undefined),
    },
    load: {
      filter,
      handler: (id: string) => modules[id],
    },
  };
}
