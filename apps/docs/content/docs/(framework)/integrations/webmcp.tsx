'use client';
import { useEffect } from 'react';
import { useRouter } from 'fumadocs-core/framework';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import { docsContentRoute, docsRoute } from '@/lib/shared';

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

/** the Markdown URL of a page, e.g. `/docs/page` -> `/llms.mdx/docs/page/content.md` */
function markdownUrl(url: string) {
  const start = url.indexOf(docsRoute);
  const slugs = url.slice(start + docsRoute.length).replace(/^\//, '');
  return [url.slice(0, start) + docsContentRoute, slugs, 'content.md'].filter(Boolean).join('/');
}

/** expose the docs to AI agents in the browser */
export function WebMCP() {
  const router = useRouter();

  useEffect(() => {
    const context = document.modelContext;
    if (!context) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const client = fetchClient();

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
          if (!res.ok) throw new Error(`page not found: ${url}`);
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
          return `opened ${url}`;
        },
      },
      options,
    );

    return () => controller.abort();
  }, [router]);

  return null;
}
