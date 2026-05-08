import {
  convertToModelMessages,
  LanguageModel,
  stepCountIs,
  streamText,
  Tool,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { Document, type MergedDocumentSearchResults, type DocumentData } from 'flexsearch';
import type { AppContext, ConfigContext } from '@fumapress/core';
import type { LoaderOutput } from 'fumadocs-core/source';

export interface PageDocument extends DocumentData {
  url: string;
  title: string;
  description: string;
  content: string;
}

export type ChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

async function chunkedAll<O>(promises: (O | Promise<O>)[]): Promise<O[]> {
  const SIZE = 100;
  const out: O[] = [];
  for (let i = 0; i < promises.length; i += SIZE) {
    out.push(...(await Promise.all(promises.slice(i, i + SIZE))));
  }
  return out;
}

export interface AIRouteOptions<C extends ConfigContext = ConfigContext> {
  model: LanguageModel;
  systemPrompt?: string;
  pageToIndex?: (
    this: AppContext<C>,
    page: C['loaderConfig']['page'],
  ) => PageDocument | null | Promise<PageDocument | null>;
}

export function createRouteHandler<C extends ConfigContext>(
  options: AIRouteOptions<C>,
  ctx: AppContext<C>,
) {
  const { getLoader, siteConfig } = ctx;
  const {
    model,
    systemPrompt = [
      `You are an AI assistant for "${siteConfig.name}" documentation site.`,
      'Use the `search` tool to retrieve relevant docs context before answering when needed.',
      'The `search` tool returns raw JSON results from documentation. Use those results to ground your answer and cite sources as markdown links using the document `url` field when available.',
      'If you cannot find the answer in search results, say you do not know and suggest a better search query.',
    ].join('\n'),
    pageToIndex = async function (page): Promise<PageDocument | null> {
      for (const adapter of this.adapters) {
        const txt = await adapter['core:get-text']?.call(this as unknown as AppContext, page);

        if (txt !== undefined) {
          return {
            title: page.data.title ?? '',
            description: page.data.description ?? '',
            url: page.url,
            content: txt,
          };
        }
      }

      return null;
    },
  } = options;

  const searchServers = new WeakMap<
    LoaderOutput<C['loaderConfig']>,
    ReturnType<typeof createSearchServer>
  >();

  async function createSearchServer(source: LoaderOutput) {
    const search = new Document<PageDocument>({
      document: {
        id: 'url',
        index: ['title', 'description', 'content'],
        store: true,
      },
    });

    const docs = await chunkedAll(source.getPages().map(pageToIndex.bind(ctx)));

    for (const doc of docs) {
      if (doc) search.add(doc);
    }

    return search;
  }

  const searchTool: SearchTool = tool({
    description: 'Search the docs content and return raw JSON results.',
    inputSchema: z.object({
      query: z.string(),
      limit: z.number().int().min(1).max(100).default(10),
    }),
    async execute({ query, limit }) {
      const source = await getLoader();
      let server = searchServers.get(source);
      if (!server) {
        server = createSearchServer(source);
        searchServers.set(source, server);
      }

      return await (await server).searchAsync(query, { limit, merge: true, enrich: true });
    },
  });

  async function onRequest(req: Request) {
    const reqJson = await req.json();

    const result = streamText({
      model,
      stopWhen: stepCountIs(5),
      tools: {
        search: searchTool,
      },
      messages: [
        { role: 'system', content: systemPrompt },
        ...(await convertToModelMessages<ChatUIMessage>(reqJson.messages ?? [], {
          convertDataPart(part) {
            if (part.type === 'data-client')
              return {
                type: 'text',
                text: `[Client Context: ${JSON.stringify(part.data)}]`,
              };
          },
        })),
      ],
      toolChoice: 'auto',
    });

    return result.toUIMessageStreamResponse();
  }

  return { searchTool, onRequest };
}

export type SearchTool = Tool<
  {
    query: string;
    limit: number;
  },
  MergedDocumentSearchResults<PageDocument>
>;
