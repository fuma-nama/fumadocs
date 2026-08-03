import { DataSourceId, orama } from '@/lib/orama/client';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { ProvideLinksToolSchema } from '@/lib/inkeep/inkeep-qa-schema';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

const openai = createOpenAICompatible({
  name: 'inkeep',
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1',
});

const handler = createMcpHandler(() => {
  const server = new McpServer({
    name: 'fumadocs',
    version: '1.0.0',
  });

  server.registerTool(
    'search',
    {
      title: 'Search Docs',
      description: 'Search docs pages with a query',
      inputSchema: z.object({
        query: z.string('the search query'),
      }),
    },
    async ({ query }) => {
      const result = await orama.search({
        term: query,
        datasources: [DataSourceId],
        limit: 50,
      });

      return {
        content: result.hits.map((hit) => ({
          type: 'text',
          text: JSON.stringify(hit.document),
        })),
      };
    },
  );

  server.registerTool(
    'ask-ai',
    {
      title: 'Ask AI',
      description: 'Ask another specialized AI a question for more info',
      inputSchema: z.object({
        message: z.string(),
      }),
    },
    async ({ message }) => {
      const result = await generateText({
        model: openai('inkeep-qa-sonnet-4'),
        tools: {
          provideLinks: {
            inputSchema: ProvideLinksToolSchema,
          },
        },
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      return {
        content: [
          {
            type: 'text',
            text: result.text,
          },
        ],
      };
    },
  );

  return server;
});

export const GET = (req: Request) => handler.fetch(req);
export const POST = (req: Request) => handler.fetch(req);
export const DELETE = (req: Request) => handler.fetch(req);
