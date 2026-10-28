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
   * Content directory, relative to the project root. Fumadocs only processes the MDX files in it, `docsLoader()` and `metaLoader()` load from it.
   *
   * @defaultValue 'content/docs'
   */
  dir?: string;

  /**
   * Module whose default export is the MDX components, like `./src/components/mdx.tsx`.
   */
  components: string;

  /**
   * Enable `getText('processed')` on pages.
   *
   * @defaultValue false
   */
  includeProcessedMarkdown?: boolean;
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
  dir = 'content/docs',
  components,
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
        const contentDir = path.resolve(root, dir);
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
        const isContent = ({ fileURL, sourceFormat }: PluginFactoryContext): boolean => {
          if (!fileURL || sourceFormat !== 'mdx') return false;
          const relative = path.relative(contentDir, fileURLToPath(fileURL));
          return !relative.startsWith('..') && !path.isAbsolute(relative);
        };

        satteri.mdastPlugins.push(
          (ctx) =>
            isContent(ctx) && [
              remarkInclude({ cwd: root }),
              ...preset.mdastPlugins!,
              includeProcessedMarkdown && remarkLlms({ as: '' }),
              hideCode,
            ],
        );
        satteri.hastPlugins.push(
          (ctx) =>
            isContent(ctx) && [
              restoreCode,
              ...preset.hastPlugins!,
              exportData,
              islandPlugin(internalModule('island')),
            ],
        );

        // on every page, as persisted islands can move to pages without content
        injectScript(
          'page',
          `import { onBeforeSwap } from ${JSON.stringify(internalModule('navigation'))};
document.addEventListener('astro:before-swap', onBeforeSwap);`,
        );
        updateConfig({
          integrations,
          vite: {
            plugins: [
              virtualPlugin({
                // resolved from the project rather than this package
                'virtual:fumadocs/mdx-components': `export { default } from ${JSON.stringify(
                  components.startsWith('.')
                    ? path.resolve(root, components).replaceAll(path.sep, '/')
                    : components,
                )};`,
                'virtual:fumadocs/config': `export const dir = ${JSON.stringify(dir)};`,
              }),
            ],
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

function virtualPlugin(modules: Record<string, string>) {
  return {
    name: '@fumadocs/astro:virtual',
    resolveId: {
      filter: { id: /^virtual:fumadocs\// },
      handler: (id: string) => (id in modules ? `\0${id}` : undefined),
    },
    load: {
      filter: { id: /^\0virtual:fumadocs\// },
      handler: (id: string) => modules[id.slice(1)],
    },
  };
}
