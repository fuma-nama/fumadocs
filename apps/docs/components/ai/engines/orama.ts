import type {
  Engine,
  MessageRecord,
  MessageReference,
} from '@/components/ai/search-ai';
import { OramaClient } from '@oramacloud/client';

const context =
  'The user is a web developer who knows some Next.js and React.js, but is new to Fumadocs.';
const endpoint = process.env.NEXT_PUBLIC_ORAMA_ENDPOINT;
const apiKey = process.env.NEXT_PUBLIC_ORAMA_API_KEY;

export async function createOramaEngine(): Promise<Engine> {
  if (!endpoint || !apiKey) throw new Error('Failed to find api keys');
  const client = new OramaClient({
    endpoint,
    api_key: apiKey,
  });
  let onSuggestions: (suggestions: string[]) => void | undefined;
  let onSourceChange: (sources: MessageReference[]) => void | undefined;

  const instance = client.createAnswerSession({
    userContext: context,
    inferenceType: 'documentation',
    events: {
      onSourceChange(sources) {
        onSourceChange?.(
          (sources as unknown as typeof sources.hits).map(
            (result) => result.document as MessageReference,
          ),
        );
      },
      onRelatedQueries(queries) {
        onSuggestions?.(queries);
      },
    },
  });

  onSuggestions = (suggestions) => {
    const last = instance.getMessages().at(-1);

    if (last) {
      (last as MessageRecord).suggestions = suggestions;
    }
  };

  onSourceChange = (sources) => {
    const last = instance.getMessages().at(-1);

    if (last) {
      (last as MessageRecord).references = sources;
    }
  };

  return {
    async prompt(text, onUpdate, onEnd) {
      let v = '';
      const stream = await instance.askStream({
        term: text,
      });

      for await (const block of stream) {
        v = block;
        onUpdate?.(block);
      }
      onEnd?.(v);
    },
    abortAnswer() {
      instance.abortAnswer();
    },
    getHistory() {
      return instance.getMessages();
    },
    clearHistory() {
      instance.clearSession();
    },
    async regenerateLast(onUpdate, onEnd) {
      const result = await instance.regenerateLast({ stream: true });
      let v = '';

      for await (const block of result) {
        v = block;
        onUpdate?.(block);
      }
      onEnd?.(v);
    },
  };
}
