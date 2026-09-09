import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { SearchServer } from '@/search/server';
import type { LLMsWithPages } from '@/source/llms';
import type { LoaderConfig, LoaderOutput } from '@/source/loader';

/**
 * Register a `search` tool, backed by a search server from `fumadocs-core/search/server`.
 */
export function registerSearchTool(mcp: McpServer, server: SearchServer): void {
  mcp.registerTool(
    'search',
    {
      title: 'Search Docs',
      description: 'Search docs pages with a query',
      inputSchema: z.object({
        query: z.string(),
        locale: z.string().optional(),
      }),
    },
    async ({ query, locale }) => ({
      content: [{ type: 'text', text: JSON.stringify(await server.search(query, { locale })) }],
    }),
  );
}

/**
 * Register `list_pages` and `get_page` tools, backed by a source and its `llms()` renderer.
 */
export function registerSourceTools<C extends LoaderConfig>(
  mcp: McpServer,
  source: LoaderOutput<C>,
  llms: LLMsWithPages<C['page']>,
): void {
  mcp.registerTool(
    'list_pages',
    {
      title: 'List Pages',
      description: 'List all docs pages with their pathnames (URLs)',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: llms.index() }],
    }),
  );

  mcp.registerTool(
    'get_page',
    {
      title: 'Get Page',
      description: 'Get the Markdown content of a docs page by its pathname (URL)',
      inputSchema: z.object({
        url: z.string(),
      }),
    },
    async ({ url }) => {
      const page = source.getPageByUrl(url);
      if (!page)
        return {
          content: [{ type: 'text', text: `page not found: ${url}` }],
          isError: true,
        };

      return {
        content: [{ type: 'text', text: await llms.page(page) }],
      };
    },
  );
}
