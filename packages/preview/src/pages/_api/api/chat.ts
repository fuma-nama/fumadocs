import {
  convertToModelMessages,
  LanguageModel,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { getSource, Source } from '@/lib/source';
import { Document, type DocumentData } from 'flexsearch';
import { revalidable } from '@/lib/revalidable';
import { getConfigRuntime } from '@/config/load-runtime';
import { defaultModel, isAISupported } from '@/lib/ai';

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

let cached: Promise<LanguageModel> | undefined;

const rateLimitWindowMs = 60 * 1000;
const rateLimitMaxRequests = 20;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function defaultModelCached(): Promise<LanguageModel> {
  return (cached ??= defaultModel());
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const [clientIp] = forwardedFor.split(',');

    if (clientIp) return clientIp.trim();
  }

  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-client-ip') ??
    'unknown'
  );
}

function checkRateLimit(req: Request): { success: true } | { success: false; retryAfter: number } {
  const now = Date.now();
  const ip = getClientIp(req);
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(ip, {
      count: 1,
      resetAt: now + rateLimitWindowMs,
    });

    for (const [key, value] of rateLimitBuckets) {
      if (value.resetAt <= now) rateLimitBuckets.delete(key);
    }

    return { success: true };
  }

  if (bucket.count >= rateLimitMaxRequests) {
    return {
      success: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return { success: true };
}

export async function POST(req: Request) {
  const config = await getConfigRuntime();
  const isSupported = await isAISupported();
  if (!isSupported) return new Response('Not Supported', { status: 400 });

  if (config.ai.ratelimit) {
    const rateLimit = checkRateLimit(req);

    if (!rateLimit.success) {
      return new Response('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
        },
      });
    }
  }

  const reqJson: { messages?: UIMessage[] } = await req.json();

  const result = streamText({
    model: config.ai.model ?? (await defaultModelCached()),
    stopWhen: stepCountIs(5),
    tools: {
      search: searchTool,
    },
    system: systemPrompt,
    messages: await convertToModelMessages(reqJson.messages ?? []),
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
