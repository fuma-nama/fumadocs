import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute } from '@/project/route';
import { addReactRouterPrerenderArray } from '@/codemod';
import { llms } from './llms';
import { reactFramework, reactRouterTypes, registerReactRouterRoutes, requiresMdx } from './utils';

const server = (
  i18n: boolean,
) => `import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { createFromSource } from 'fumadocs-core/search/server';
import { llms } from 'fumadocs-core/source';
import { z } from 'zod';
import { getLLMText, source } from '@/lib/source';

const search = createFromSource(source);

function findPage(url: string) {
${
  i18n
    ? `  for (const { pages } of source.getLanguages()) {
    for (const page of pages) if (page.url === url) return page;
  }`
    : `  for (const page of source.getPages()) if (page.url === url) return page;`
}
}

const handler = createMcpHandler(() => {
  const server = new McpServer({
    name: 'docs',
    version: '1.0.0',
  });

  server.registerTool(
    'list_pages',
    {
      title: 'List Pages',
      description: 'List all docs pages with their URLs',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: llms(source).index() }],
    }),
  );

  server.registerTool(
    'search',
    {
      title: 'Search Docs',
      description: 'Search docs pages with a query',
      inputSchema: z.object({
        query: z.string(),${i18n ? '\n        locale: z.string().optional(),' : ''}
      }),
    },
    async ({ query${i18n ? ', locale' : ''} }) => {
      const results = await search.search(query${i18n ? ', { locale }' : ''});

      return {
        content: [{ type: 'text', text: JSON.stringify(results) }],
      };
    },
  );

  server.registerTool(
    'get_page',
    {
      title: 'Get Page',
      description: 'Get the Markdown content of a docs page by its URL',
      inputSchema: z.object({
        url: z.string(),
      }),
    },
    async ({ url }) => {
      const page = findPage(url);
      if (!page) {
        return {
          content: [{ type: 'text', text: \`page not found: \${url}\` }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: await getLLMText(page) }],
      };
    },
  );

  return server;
});
`;

type Template = (route: FormattedRoute, i18n: boolean) => string;

const templates: Record<ReactFramework, Template> = {
  next: (_, i18n) => `${server(i18n)}
export const GET = (req: Request) => handler.fetch(req);
export const POST = (req: Request) => handler.fetch(req);
export const DELETE = (req: Request) => handler.fetch(req);
`,
  'react-router': (route, i18n) => `${reactRouterTypes(route)}
${server(i18n)}
export const loader = ({ request }: Route.LoaderArgs) => handler.fetch(request);
export const action = ({ request }: Route.ActionArgs) => handler.fetch(request);
`,
  'tanstack-start': (route, i18n) => `import { createFileRoute } from '@tanstack/react-router';
${server(i18n)}
export const Route = createFileRoute('${route.path}')({
  server: {
    handlers: {
      GET: ({ request }) => handler.fetch(request),
      POST: ({ request }) => handler.fetch(request),
      DELETE: ({ request }) => handler.fetch(request),
    },
  },
});
`,
  waku: (_, i18n) => `${server(i18n)}
export const GET = (request: Request) => handler.fetch(request);
export const POST = (request: Request) => handler.fetch(request);
export const DELETE = (request: Request) => handler.fetch(request);
`,
};

export const mcp: Feature = {
  id: 'mcp',
  title: 'MCP Server',
  description: 'a MCP server for AI agents to search and read your docs, at /api/mcp',
  requires: [llms],
  supports: (project) =>
    project.static ? 'MCP requires a server at runtime' : requiresMdx(project),
  async apply(ctx) {
    const { baseDir, i18n } = ctx.project;
    const framework = reactFramework(ctx.project);
    ctx.addDependencies({ '@modelcontextprotocol/server': null, zod: null });

    const route = formatRoute({ segments: ['api/mcp'] }, framework, null);
    await ctx.write(path.join(baseDir, route.file), templates[framework](route, i18n !== null));

    if (framework === 'react-router') {
      await registerReactRouterRoutes(ctx, [route]);
      await ctx.source('react-router.config.ts', (file) => {
        addReactRouterPrerenderArray(file, 'excluded', [`/${route.path}`]);
      });
    }

    ctx.note(`Connect AI agents to your docs with the MCP server:
{
  "mcpServers": {
    "docs": { "url": "https://your-site.com/api/mcp" }
  }
}`);
  },
};
