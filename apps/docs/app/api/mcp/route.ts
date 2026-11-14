import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { ProvideLinksToolSchema } from '@/lib/inkeep/inkeep-qa-schema';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp';
import { docsLlms } from '@/lib/llms';
import { source } from '@/lib/source';
import { search } from '@/lib/search';
import { defaultFramework } from '@/lib/framework';

const openai = createOpenAICompatible({
  name: 'inkeep',
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1',
});

const handler = createMcpHandler(() => {
  const server = new McpServer(
    {
      name: 'fumadocs',
      version: '1.0.0',
    },
    // the tools never change, a stream to watch them would hold a function open until it times out
    { capabilities: { tools: { listChanged: false } } },
  );

  registerSourceTools(server, source, docsLlms);
  registerSearchTool(server, {
    ...search,
    // the frameworks have the same pages, like in `llms.txt`
    search: (query, options) => search.search(query, { ...options, tag: defaultFramework }),
  });

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
        model: openai('inkeep-qa-expert'),
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
