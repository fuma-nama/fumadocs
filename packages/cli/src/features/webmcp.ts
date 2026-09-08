import path from 'node:path';
import type { Feature } from '@/features';
import { addImport, appendJsxChildren, findJsxElement } from '@/codemod';
import { llms } from './llms';
import { findSource, reactFramework, requiresMdx } from './utils';

interface Input {
  static: boolean;
  i18n: boolean;
  /** the Markdown route of TanStack Start is `/docs/*.md` */
  tanstack: boolean;
}

export const component = ({ static: isStatic, i18n, tanstack }: Input) => `'use client';
import { useEffect } from 'react';
import { useRouter } from 'fumadocs-core/framework';
import { ${isStatic ? 'staticClient' : 'fetchClient'} } from 'fumadocs-core/search/client/${isStatic ? 'orama-static' : 'fetch'}';
${i18n ? "import { useI18n } from 'fumadocs-ui/contexts/i18n';\n" : ''}import { ${tanstack ? 'docsRoute' : 'docsContentRoute, docsRoute'} } from '@/lib/shared';

interface ModelContextTool<Input> {
  name: string;
  description: string;
  inputSchema?: object;
  execute: (input: Input) => Promise<unknown>;
}

declare global {
  interface Document {
    /** WebMCP, see https://webmachinelearning.github.io/webmcp/ */
    modelContext?: {
      registerTool: <Input>(
        tool: ModelContextTool<Input>,
        options?: { signal?: AbortSignal },
      ) => Promise<void>;
    };
  }
}

/** the Markdown URL of a page, e.g. ${tanstack ? '`/docs/page` -> `/docs/page.md`' : '`/docs/page` -> `/llms.mdx/docs/page/content.md`'} */
function markdownUrl(url: string) {
${
  tanstack
    ? '  return url.endsWith(docsRoute) ? `${url}/index.md` : `${url}.md`;'
    : `  const start = url.indexOf(docsRoute);
  const slugs = url.slice(start + docsRoute.length).replace(/^\\//, '');
  return [url.slice(0, start) + docsContentRoute, slugs, 'content.md'].filter(Boolean).join('/');`
}
}

/** expose the docs to AI agents in the browser */
export function WebMCP() {
  const router = useRouter();
${i18n ? '  const { locale } = useI18n();\n' : ''}
  useEffect(() => {
    const context = document.modelContext;
    if (!context) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const client = ${isStatic ? 'staticClient' : 'fetchClient'}(${i18n ? '{ locale }' : ''});

    void context.registerTool(
      {
        name: 'search_docs',
        description: 'Search the docs, returns matching pages and headings with their URLs',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
        async execute({ query }: { query: string }) {
          return client.search(query);
        },
      },
      options,
    );
    void context.registerTool(
      {
        name: 'read_page',
        description: 'Read a docs page as Markdown by its URL',
        inputSchema: {
          type: 'object',
          properties: { url: { type: 'string' } },
          required: ['url'],
        },
        async execute({ url }: { url: string }) {
          const res = await fetch(markdownUrl(url));
          if (!res.ok) throw new Error(\`page not found: \${url}\`);
          return res.text();
        },
      },
      options,
    );
    void context.registerTool(
      {
        name: 'open_page',
        description: 'Navigate to a docs page by its URL',
        inputSchema: {
          type: 'object',
          properties: { url: { type: 'string' } },
          required: ['url'],
        },
        async execute({ url }: { url: string }) {
          await router.push(url);
          return \`opened \${url}\`;
        },
      },
      options,
    );

    return () => controller.abort();
  }, [router${i18n ? ', locale' : ''}]);

  return null;
}
`;

export const webmcp: Feature = {
  id: 'webmcp',
  title: 'WebMCP',
  description:
    'expose tools to AI agents in the browser (experimental): search, read and open docs pages',
  requires: [llms],
  supports: requiresMdx,
  async apply(ctx) {
    const { cwd, baseDir, i18n } = ctx.project;
    const framework = reactFramework(ctx.project);
    await ctx.write(
      path.join(baseDir, 'components/webmcp.tsx'),
      component({
        static: ctx.project.static,
        i18n: i18n !== null,
        tanstack: framework === 'tanstack-start',
      }),
    );

    const provider = await findSource(cwd, baseDir, '<RootProvider');
    const edited =
      provider !== undefined &&
      (await ctx.source(provider, (file) => {
        if (file.code.includes('<WebMCP')) return;
        const element = findJsxElement(file, 'RootProvider');
        if (!element) return;
        appendJsxChildren(file, element, '<WebMCP />');
        addImport(file, { from: '@/components/webmcp', named: ['WebMCP'] });
      }));
    if (!edited)
      ctx.note('Render `<WebMCP />` from `@/components/webmcp` inside `<RootProvider />`.');

    ctx.note(
      'WebMCP is experimental, test it with the `#enable-webmcp-testing` flag of Chrome. The `search_docs` tool uses the search API route, see https://fumadocs.dev/docs/integrations/llms#webmcp.',
    );
  },
};
