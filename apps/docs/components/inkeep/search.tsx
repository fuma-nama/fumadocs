'use client';
import type { ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { z } from 'zod';
import { AIChatProvider, AIChatSources } from '@fumadocs/ai-chat';
import type { ProvideLinksToolSchema } from '@/lib/inkeep/inkeep-qa-schema';
import type { InkeepUIMessage } from '@/lib/inkeep/route';

export { AIChatPanel, AIChatTrigger, useAIChat } from '@fumadocs/ai-chat';

export function AIChat({ children }: { children: ReactNode }) {
  const chat = useChat<InkeepUIMessage>({
    id: 'search',
    throttle: 40,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <AIChatProvider
      chat={chat}
      renderPart={renderPart}
      description={
        <>
          Answers from the docs, powered by{' '}
          <a
            href="https://inkeep.com"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-fd-foreground underline-offset-4 hover:underline"
          >
            Inkeep AI
          </a>
          .
        </>
      }
    >
      {children}
    </AIChatProvider>
  );
}

function renderPart(part: InkeepUIMessage['parts'][number]) {
  // links stream in as partial JSON
  if (part.type !== 'tool-provideLinks' || part.state === 'input-streaming') return;
  const input = part.input as z.infer<typeof ProvideLinksToolSchema> | undefined;

  return <AIChatSources sources={input?.links ?? []} />;
}
