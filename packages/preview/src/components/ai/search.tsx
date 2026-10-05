'use client';
import type { ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type InferUITool, type UIMessage } from 'ai';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { AIChatPanel, AIChatProvider, AIChatSearch, useAIChat } from '@fumadocs/ai-chat';
import type { SearchTool } from '@/pages/_api/api/chat';

export { AIChatTrigger } from '@fumadocs/ai-chat';

type ChatUIMessage = UIMessage<never, never, { search: InferUITool<SearchTool> }>;

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
      renderPart={(part, live) =>
        part.type === 'tool-search' && <AIChatSearch part={part} live={live} />
      }
    >
      {children}
    </AIChatProvider>
  );
}

export function AIDocsLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAIChat();

  return <DocsLayout {...props} aiChat={{ open, onOpenChange: setOpen, panel: <AIChatPanel /> }} />;
}
