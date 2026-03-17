import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { getSource, Source } from '@/lib/source';
import { Document, type DocumentData } from 'flexsearch';
import { revalidable } from '@/lib/revalidable';
import { getConfigRuntime } from '@/config/load-runtime';
import { defaultModelCached } from '@/lib/ai';

interface CustomDocument extends DocumentData {
  url: string;
  title: string;
  description: string;
  content: string;
}

const createSearchServer = revalidable({
  create(source: Source) {
    const search = new Document<CustomDocument>({
      document: {
        id: 'url',
        index: ['title', 'description', 'content'],
        store: true,
      },
    });

    for (const page of source.getPages()) {
      search.add({
        title: page.data.title,
        description: page.data.description,
        url: page.url,
        content: page.data.content,
      } as CustomDocument);
    }

    return search;
  },
});

const systemPrompt = [
  'You are an AI assistant for a documentation site.',
  'Use the `search` tool to retrieve relevant docs context before answering when needed.',
  'The `search` tool returns raw JSON results from documentation. Use those results to ground your answer and cite sources as markdown links using the document `url` field when available.',
  'If you cannot find the answer in search results, say you do not know and suggest a better search query.',
].join('\n');

export async function POST(req: Request) {
  const { ai: { createModel = defaultModelCached } = {} } = await getConfigRuntime();
  const reqJson: { messages?: UIMessage[] } = await req.json();

  const model = await createModel();
  const result = streamText({
    model,
    stopWhen: stepCountIs(5),
    tools: {
      search: searchTool,
    },
    messages: [
      { role: 'system', content: systemPrompt },
      ...(await convertToModelMessages(reqJson.messages ?? [])),
    ],
    toolChoice: 'auto',
  });

  return result.toUIMessageStreamResponse();
}

const searchTool = tool({
  description: 'Search the docs content and return raw JSON results.',
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  async execute({ query, limit }) {
    const config = await getConfigRuntime();
    const source = await getSource(config);
    const search = createSearchServer(source);

    return await search.searchAsync(query, { limit, merge: true, enrich: true });
  },
});

export type SearchTool = typeof searchTool;
