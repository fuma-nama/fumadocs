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
      renderPart={(part, live) =>
        part.type === 'tool-search' && <AIChatSearch part={part} live={live} />
      }
    >
      {children}
    </AIChatProvider>
  );
}
