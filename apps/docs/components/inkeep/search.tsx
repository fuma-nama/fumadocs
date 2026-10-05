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
      renderPart={(part) =>
        part.type === 'tool-provideLinks' && (
          <AIChatSources
            sources={
              (part.input as z.infer<typeof ProvideLinksToolSchema> | undefined)?.links ?? []
            }
          />
        )
      }
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
