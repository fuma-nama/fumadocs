import { ProvideLinksToolSchema } from '@/lib/inkeep/inkeep-qa-schema';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { $routeHandler } from 'fuma-cli/macros/route-handler';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

export type InkeepUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

const openai = createOpenAICompatible({
  name: 'inkeep',
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1',
});

export const handler = $routeHandler(
  {
    methods: ['POST'],
    params: [],
  },
  async (req) => {
    const reqJson = await req.json();

    const result = streamText({
      model: openai('inkeep-qa-expert'),
      tools: {
        provideLinks: {
          inputSchema: ProvideLinksToolSchema,
        },
      },
      messages: await convertToModelMessages<InkeepUIMessage>(reqJson.messages, {
        ignoreIncompleteToolCalls: true,
        convertDataPart(part) {
          if (part.type === 'data-client')
            return {
              type: 'text',
              text: `[Client Context: ${JSON.stringify(part.data)}]`,
            };
        },
      }),
      toolChoice: 'auto',
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  },
);
