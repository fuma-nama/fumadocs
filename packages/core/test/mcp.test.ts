import { expect, test } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/server';
import { llms, loader, type StaticSource } from '@/source';
import { registerSourceTools } from '@/mcp';

const source: StaticSource = {
  files: [{ type: 'page', path: 'nested/page.mdx', data: { title: 'Page' } }],
};

const docs = loader({ baseUrl: '/docs', source });

test('get_page: URLs of search results', async () => {
  const tools = new Map<string, (input: { url: string }) => Promise<unknown>>();
  const mcp = {
    registerTool: (name: string, _config: unknown, handler: (input: { url: string }) => never) =>
      tools.set(name, handler),
  } as unknown as McpServer;
  registerSourceTools(mcp, docs, llms(docs, { renderPage: (page) => `# ${page.data.title}` }));

  await expect(tools.get('get_page')!({ url: '/docs/nested/page#heading' })).resolves.toEqual({
    content: [{ type: 'text', text: '# Page' }],
  });
  // the links of `llms.txt`
  await expect(tools.get('get_page')!({ url: '/docs/nested/page.md' })).resolves.toEqual({
    content: [{ type: 'text', text: '# Page' }],
  });
});
