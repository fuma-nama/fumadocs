import type { APIRoute } from 'astro';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp';
import { createFromSource } from 'fumadocs-core/search/server';
import { llms } from 'fumadocs-core/source';
import type { App, Plugin } from '../app';
import { pageMarkdown } from '../shared';
import type { OramaSearchOptions } from './orama-search';

export interface MCPOptions {
  /** options of `createFromSource()`, for the `search` tool */
  search?: OramaSearchOptions;
  /** register more tools on the MCP server */
  tools?: (this: App, server: McpServer) => void | Promise<void>;
}

/**
 * A MCP server at `/api/mcp`, with tools to list, read and search pages. Requires `@modelcontextprotocol/server`, `zod` and an adapter.
 */
export function mcpPlugin({ search, tools }: MCPOptions = {}): Plugin {
  return {
    name: 'mcp',
    routes() {
      const searchServer = createFromSource(this.source, search);
      const output = llms(this.source, { renderPage: (page) => pageMarkdown(this, page) });
      // stateless, a server per request
      const handler = createMcpHandler(async () => {
        const server = new McpServer({ name: this.config.title ?? 'docs', version: '1.0.0' });
        registerSourceTools(server, this.source, output);
        registerSearchTool(server, searchServer);
        await tools?.call(this, server);
        return server;
      });
      const handle: APIRoute = ({ request }) => handler.fetch(request);

      return [
        {
          type: 'file',
          url: `${this.base}/api/mcp`,
          prerender: false,
          GET: handle,
          POST: handle,
          DELETE: handle,
        },
      ];
    },
  };
}
