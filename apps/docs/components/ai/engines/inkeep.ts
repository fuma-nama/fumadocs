import type { Engine } from '@/components/ai/search-ai';
import { InkeepAI } from '@inkeep/ai-api';
import type { RecordsCited } from '@inkeep/ai-api/models/components';

export async function createInkeepEngine(): Promise<Engine> {
  const ai = new InkeepAI({
    apiKey: process.env.NEXT_PUBLIC_INKEEP_API_KEY,
  });
  let messages: {
    role: 'user' | 'assistant';
    content: string;
    recordsCited?: RecordsCited;
  }[] = [];

  let aborted = true;

  async function generateNew(
    onUpdate?: (full: string) => void,
    onEnd?: (full: string) => void,
  ) {
    const result = await ai.chatSession.create({
      integrationId: process.env.NEXT_PUBLIC_INKEEP_INTEGRATION_ID!,
      stream: true,
      chatSession: {
        messages,
      },
    });

    if (result.chatResultStream == null) {
      const content =
        "Sorry, I don't have enough details to answer your question.";
      messages.push({
        role: 'assistant',
        content,
      });

      onEnd?.(content);
      return;
    }

    const message: (typeof messages)[number] = {
      role: 'assistant',
      content: '',
    };

    aborted = false;
    messages.push(message);

    for await (const event of result.chatResultStream) {
      if (aborted) break;
      if (event.event === 'records_cited') {
        message.recordsCited = event.data;
      }

      if (event.event === 'message_chunk') {
        message.content += event.data.contentChunk;

        onUpdate?.(message.content);
      }
    }

    onEnd?.(message.content);
  }

  return {
    async prompt(text, onUpdate, onEnd) {
      messages.push({
        role: 'user',
        content: text,
      });

      await generateNew(onUpdate, onEnd);
    },
    async regenerateLast(onUpdate, onEnd) {
      const last = messages.at(-1);
      if (!last || last.role === 'user') {
        return;
      }

      messages.pop();
      await generateNew(onUpdate, onEnd);
    },
    getHistory() {
      return messages.map((v) => ({
        role: v.role,
        content: v.content,
        references:
          v.recordsCited?.citations.map((cite) => ({
            breadcrumbs: cite.record.breadcrumbs ?? [],
            title: cite.record.title ?? 'Reference',
            content: cite.record.description,
            url: cite.hitUrl ?? '#',
          })) ?? [],
      }));
    },
    clearHistory() {
      messages = [];
    },
    abortAnswer() {
      aborted = true;
    },
  };
}
