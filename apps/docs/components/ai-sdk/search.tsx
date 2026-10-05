'use client';
import type { ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type InferUITool, type Tool, type UIMessage } from 'ai';
import { AIChatProvider, AIChatSearch } from '@fumadocs/ai-chat';

export { AIChatPanel, AIChatTrigger, useAIChat } from '@fumadocs/ai-chat';

export type SearchTool = Tool<
  { query: string; limit: number },
  { doc?: { url: string; title: string } | null }[]
>;

export type ChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  },
  { search: InferUITool<SearchTool> }
>;

export function AIChat({ children }: { children: ReactNode }) {
  const chat = useChat<ChatUIMessage>({
    id: 'search',
    throttle: 40,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <AIChatProvider
      chat={chat}
      toMessage={(text) => ({
        role: 'user',
        parts: [
          { type: 'data-client', data: { location: location.href } },
          { type: 'text', text },
        ],
      })}
      renderPart={renderPart}
    >
      {children}
    </AIChatProvider>
  );
}

function renderPart(part: ChatUIMessage['parts'][number], live: boolean) {
  if (part.type === 'tool-search') return <AIChatSearch part={part} live={live} />;
}
