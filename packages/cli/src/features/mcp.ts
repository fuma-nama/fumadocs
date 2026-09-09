import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute } from '@/project/route';
import { addReactRouterPrerenderArray } from '@/codemod';
import { llms } from './llms';
import { reactFramework, reactRouterTypes, registerReactRouterRoutes, requiresMdx } from './utils';

const server = `import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp';
import { createFromSource } from 'fumadocs-core/search/server';
import { docsLlms, source } from '@/lib/source';

const handler = createMcpHandler(() => {
  const mcp = new McpServer({
    name: 'docs',
    version: '1.0.0',
  });

  registerSourceTools(mcp, source, docsLlms);
  registerSearchTool(mcp, createFromSource(source));

  return mcp;
});
`;

type Template = (route: FormattedRoute) => string;

export const templates: Record<ReactFramework, Template> = {
  next: () => `${server}
export const GET = (req: Request) => handler.fetch(req);
export const POST = (req: Request) => handler.fetch(req);
export const DELETE = (req: Request) => handler.fetch(req);
`,
  'react-router': (route) => `${reactRouterTypes(route)}
${server}
export const loader = ({ request }: Route.LoaderArgs) => handler.fetch(request);
export const action = ({ request }: Route.ActionArgs) => handler.fetch(request);
`,
  'tanstack-start': (route) => `import { createFileRoute } from '@tanstack/react-router';
${server}
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
  waku: () => `${server}
export const GET = (request: Request) => handler.fetch(request);
export const POST = (request: Request) => handler.fetch(request);
export const DELETE = (request: Request) => handler.fetch(request);
`,
};

export const mcpRoute = (framework: ReactFramework) =>
  formatRoute({ segments: ['api/mcp'] }, framework, null);

export const mcp: Feature = {
  id: 'mcp',
  title: 'MCP Server',
  description: 'a MCP server for AI agents to search and read your docs, at /api/mcp',
  requires: [llms],
  supports: (project) =>
    project.static ? 'MCP requires a server at runtime' : requiresMdx(project),
  async apply(ctx) {
    const { baseDir } = ctx.project;
    const framework = reactFramework(ctx.project);
    ctx.addDependencies({ '@modelcontextprotocol/server': null, zod: null });

    const route = mcpRoute(framework);
    await ctx.write(path.join(baseDir, route.file), templates[framework](route));

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
