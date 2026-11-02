import path from 'node:path';
import type { Feature } from '@/features';
import type { Framework } from '@/project';
import { addImport, appendJsxChildren, findJsxElement } from '@/codemod';
import { llms } from './llms';
import { astroModule, findSource, requiresManagedMarkdown } from './utils';

interface Input {
  static: boolean;
  i18n: boolean;
  framework: Framework;
}

/** `markdownUrl()` of the component, following the Markdown routes of the framework */
function markdownTemplate(framework: Framework) {
  switch (framework) {
    // the `llms.txt` plugin of the Fumadocs integration
    case 'astro':
      return {
        imports: '',
        example: '`/docs/page` -> `/docs/page.md`, `/` -> `/index.md`',
        body: `  const path = url.replace(/\\/$/, '');
  const base = import.meta.env.BASE_URL.replace(/\\/$/, '');
  return path === base ? \`\${base}/index.md\` : \`\${path}.md\`;`,
      };
    case 'tanstack-start':
      return {
        imports: "import { docsRoute } from '@/lib/shared';\n",
        example: '`/docs/page` -> `/docs/page.md`',
        body: '  return url.endsWith(docsRoute) ? `${url}/index.md` : `${url}.md`;',
      };
    default:
      return {
        imports: "import { docsContentRoute, docsRoute } from '@/lib/shared';\n",
        example: '`/docs/page` -> `/llms.mdx/docs/page/content.md`',
        body: `  const start = url.indexOf(docsRoute);
  const slugs = url.slice(start + docsRoute.length).replace(/^\\//, '');
  return [url.slice(0, start) + docsContentRoute, slugs, 'content.md'].filter(Boolean).join('/');`,
      };
  }
}

export const component = ({ static: isStatic, i18n, framework }: Input) => {
  const markdown = markdownTemplate(framework);
  // the built-in search index of Astro is static
  const client = isStatic || framework === 'astro' ? 'staticClient' : 'fetchClient';

  return `'use client';
import { useEffect } from 'react';
import { useRouter } from 'fumadocs-core/framework';
import { ${client} } from 'fumadocs-core/search/client/${client === 'staticClient' ? 'orama-static' : 'fetch'}';
${i18n ? "import { useI18n } from 'fumadocs-ui/contexts/i18n';\n" : ''}${markdown.imports}
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

/** the Markdown URL of a page, e.g. ${markdown.example} */
function markdownUrl(url: string) {
${markdown.body}
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
    const client = ${client}(${i18n ? '{ locale }' : ''});

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
};

/** the `Provider` of the layout module on Astro */
const astroProvider = `
export function Provider({ children }: { children: ReactNode }) {
  return (
    <>
      <WebMCP />
      {children}
    </>
  );
}
`;

export const webmcp: Feature = {
  id: 'webmcp',
  title: 'WebMCP',
  description:
    'expose tools to AI agents in the browser (experimental): search, read and open docs pages',
  requires: [llms],
  supports: requiresManagedMarkdown,
  async apply(ctx) {
    const { cwd, baseDir, i18n, framework } = ctx.project;
    await ctx.write(
      path.join(baseDir, 'components/webmcp.tsx'),
      component({ static: ctx.project.static, i18n: i18n !== null, framework }),
    );

    if (framework === 'astro') {
      // the Fumadocs integration renders the root provider, with the `Provider` of the layout module in it
      const layout = await astroModule(ctx, 'layout');
      let edited = false;
      if (layout)
        await ctx.source(layout, (file) => {
          edited = file.code.includes('<WebMCP');
          if (edited || /export (function|const) Provider\b/.test(file.code)) return;
          addImport(file, { from: 'react', named: ['type ReactNode'] });
          addImport(file, { from: '@/components/webmcp', named: ['WebMCP'] });
          file.s.append(astroProvider);
          edited = true;
        });
      if (!edited)
        ctx.note(
          'Render `<WebMCP />` from `@/components/webmcp` in the `Provider` of the `layout` module.',
        );
    } else {
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
    }

    ctx.note(
      'WebMCP is experimental, test it with the `#enable-webmcp-testing` flag of Chrome. The `search_docs` tool uses the search API route, see https://fumadocs.dev/docs/integrations/llms#webmcp.',
    );
  },
};
