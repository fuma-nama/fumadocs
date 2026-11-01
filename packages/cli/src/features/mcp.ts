import path from 'node:path';
import type { Feature } from '@/features';
import type { Framework } from '@/project';
import { type FormattedRoute, formatRoute, routeModule } from '@/project/route';
import { addReactRouterPrerenderArray, addVitePlugin } from '@/codemod';
import { addDocsLlms, llms } from './llms';
import {
  registerReactRouterRoutes,
  requiresManaged,
  requiresMarkdown,
  type SourceRef,
  sourceRef,
} from './utils';

const server = ({
  ref,
}: SourceRef) => `import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp';
import { createFromSource } from 'fumadocs-core/search/server';
import { docsLlms, ${ref} } from '@/lib/source';

const handler = createMcpHandler(() => {
  const mcp = new McpServer({
    name: 'docs',
    version: '1.0.0',
  });

  registerSourceTools(mcp, ${ref}, docsLlms);
  registerSearchTool(mcp, createFromSource(${ref}));

  return mcp;
});
`;

export const templates = (framework: Framework, route: FormattedRoute, src: SourceRef) =>
  routeModule(framework, route, {
    imports: server(src),
    body: 'handler.fetch(request)',
    request: true,
    methods: ['GET', 'POST', 'DELETE'],
  });

export const mcpRoute = (framework: Framework) =>
  formatRoute({ segments: ['api/mcp'] }, framework, null);

export const mcp: Feature = {
  id: 'mcp',
  title: 'MCP Server',
  description: 'a MCP server for AI agents to search and read your docs, at /api/mcp',
  requires: [llms],
  supports(project) {
    if (project.static) return 'MCP requires a server at runtime';
    // `mcpPlugin()` reads the pages of every source
    return project.framework === 'astro' ? requiresManaged(project) : requiresMarkdown(project);
  },
  async apply(ctx) {
    const { baseDir, framework, fumadocsConfig } = ctx.project;
    ctx.addDependencies({ '@modelcontextprotocol/server': null, zod: null });
    if (framework === 'astro') {
      let added = false;
      if (fumadocsConfig)
        await ctx.source(fumadocsConfig, (file) => {
          added = addVitePlugin(file, { name: 'mcpPlugin', from: '@fumadocs/astro/plugins/mcp' });
        });
      if (!added)
        ctx.note(
          "Add `mcpPlugin()` from '@fumadocs/astro/plugins/mcp' to the `plugins` of your Fumadocs config.",
        );
    } else {
      await addDocsLlms(ctx);
      const route = mcpRoute(framework);
      await ctx.write(
        path.join(baseDir, route.file),
        templates(framework, route, sourceRef(ctx.project.source.dynamic)),
      );
      if (framework === 'react-router') {
        await registerReactRouterRoutes(ctx, [route]);
        await ctx.source('react-router.config.ts', (file) => {
          addReactRouterPrerenderArray(file, 'excluded', [`/${route.path}`]);
        });
      }
    }

    ctx.note(`Connect AI agents to your docs with the MCP server:
{
  "mcpServers": {
    "docs": { "url": "https://your-site.com/api/mcp" }
  }
}`);
  },
};
