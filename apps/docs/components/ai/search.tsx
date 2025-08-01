'use client';
import {
  createContext,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type SyntheticEvent,
  type TextareaHTMLAttributes,
  use,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Loader2, RefreshCw, Send, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from '../../../../packages/ui/src/components/ui/button';
import Link from 'fumadocs-core/link';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  type DialogProps,
  DialogTitle,
} from '@radix-ui/react-dialog';
import { type UIMessage, useChat, type UseChatHelpers } from '@ai-sdk/react';
import type { ProvideLinksToolSchema } from '@/lib/chat/inkeep-qa-schema';
import type { z } from 'zod';
import { DefaultChatTransport } from 'ai';
import { Markdown } from './markdown';

const ChatContext = createContext<UseChatHelpers<UIMessage> | null>(null);
function useChatContext() {
  return use(ChatContext)!;
}

function SearchAIActions() {
  const { messages, status, setMessages, regenerate } = useChatContext();
  const isLoading = status === 'streaming';

  if (messages.length === 0) return null;
  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-fd-popover px-3 py-1.5 flex flex-row items-center justify-end gap-2 empty:hidden">
      {!isLoading && messages.at(-1)?.role === 'assistant' && (
        <button
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
            }),
            'text-fd-muted-foreground rounded-full gap-1.5',
          )}
          onClick={() => regenerate()}
        >
          <RefreshCw className="size-4" />
          Retry
        </button>
      )}
      <button
        type="button"
        className={cn(
          buttonVariants({
            color: 'secondary',
          }),
          'text-fd-muted-foreground rounded-full',
        )}
        onClick={() => setMessages([])}
      >
        Clear Chat
      </button>
    </div>
  );
}

function SearchAIInput(props: FormHTMLAttributes<HTMLFormElement>) {
  const { status, sendMessage, stop } = useChatContext();
  const [input, setInput] = useState('');
  const isLoading = status === 'streaming' || status === 'submitted';
  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault();
    void sendMessage({ text: input });
    setInput('');
  };

  useEffect(() => {
    if (isLoading) document.getElementById('nd-ai-input')?.focus();
  }, [isLoading]);

  return (
    <form
      {...props}
      className={cn(
        'flex items-start pe-2 transition-colors',
        isLoading && 'bg-fd-muted',
        props.className,
      )}
      onSubmit={onStart}
    >
      <Input
        value={input}
        placeholder={isLoading ? 'AI is answering...' : 'Ask AI something'}
        disabled={status === 'streaming' || status === 'submitted'}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === 'Enter') {
            onStart(event);
          }
        }}
      />
      {isLoading ? (
        <button
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
              className: 'rounded-full mt-2 gap-2',
            }),
          )}
          onClick={stop}
        >
          <Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
          Abort Answer
        </button>
      ) : (
        <button
          type="submit"
          className={cn(
            buttonVariants({
              color: 'ghost',
              className: 'rounded-full mt-2 p-1.5',
            }),
          )}
          disabled={input.length === 0}
        >
          <Send className="size-4" />
        </button>
      )}
    </form>
  );
}

function List(props: Omit<HTMLAttributes<HTMLDivElement>, 'dir'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    function callback() {
      const container = containerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'instant',
      });
    }

    const observer = new ResizeObserver(callback);
    callback();

    const element = containerRef.current?.firstElementChild;

    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn(
        'fd-scroll-container overflow-y-auto max-h-[calc(100dvh-240px)] min-w-0 flex flex-col',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

function Input(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1 max-h-60 min-h-12 p-3');

  return (
    <div className="grid flex-1">
      <textarea
        id="nd-ai-input"
        className={cn(
          shared,
          'resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none',
        )}
        {...props}
      />
      <div ref={ref} className={cn(shared, 'break-all invisible')}>
        {`${props.value?.toString() ?? ''}\n`}
      </div>
    </div>
  );
}

const roleName: Record<string, string> = {
  user: 'you',
  assistant: 'fumadocs',
};

function Message({ message }: { message: UIMessage }) {
  const { parts } = message;
  let markdown = '';
  let links: z.infer<typeof ProvideLinksToolSchema>['links'] = [];

  for (const part of parts ?? []) {
    if (part.type === 'text') {
      markdown += part.text;
      continue;
    }

    if (part.type === 'tool-provideLinks' && part.input) {
      links = (part.input as z.infer<typeof ProvideLinksToolSchema>).links;
    }
  }

  return (
    <div>
      <p
        className={cn(
          'mb-1 text-xs font-medium text-fd-muted-foreground',
          message.role === 'assistant' && 'text-fd-primary',
        )}
      >
        {roleName[message.role] ?? 'unknown'}
      </p>
      <div className="prose text-sm">
        <Markdown text={markdown} />
      </div>
      {links && links.length > 0 ? (
        <div className="mt-2 flex flex-row flex-wrap items-center gap-1">
          {links.map((item, i) => (
            <Link
              key={i}
              href={item.url}
              className="block text-xs rounded-lg border p-3 hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-fd-muted-foreground">Reference {item.label}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AISearch(props: DialogProps) {
  return (
    <Dialog {...props}>
      {props.children}
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 backdrop-blur-xs data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
        <DialogContent
          onOpenAutoFocus={(e) => {
            document.getElementById('nd-ai-input')?.focus();
            e.preventDefault();
          }}
          aria-describedby={undefined}
          className="fixed flex flex-col-reverse gap-3 md:flex-col max-md:top-12 md:bottom-12 left-1/2 z-50 w-[98vw] max-w-[860px] -translate-x-1/2 focus-visible:outline-none data-[state=closed]:animate-fd-fade-out"
        >
          <Content />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

let cachedMessages: UIMessage[] = [];
function Content() {
  const chat = useChat({
    id: 'search',
    messages: cachedMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  cachedMessages = chat.messages;
  const messages = chat.messages.filter((msg) => msg.role !== 'system');

  return (
    <ChatContext value={chat}>
      {messages.length > 0 && (
        <List className="bg-fd-popover rounded-xl border shadow-lg animate-fd-dialog-in duration-600">
          <div className="flex flex-col gap-4 p-3 pb-0">
            {messages.map((item) => (
              <Message key={item.id} message={item} />
            ))}
          </div>
          <SearchAIActions />
        </List>
      )}
      <div className="p-2 bg-fd-secondary/50 rounded-xl animate-fd-dialog-in">
        <div className="rounded-xl overflow-hidden border shadow-lg bg-fd-popover text-fd-popover-foreground">
          <SearchAIInput />
          <div className="flex gap-2 items-center text-fd-muted-foreground px-3 py-1.5">
            <DialogTitle className="text-xs flex-1">
              Powered by{' '}
              <a
                href="https://inkeep.com"
                target="_blank"
                className="font-medium text-fd-popover-foreground"
                rel="noreferrer noopener"
              >
                Inkeep AI
              </a>
              . AI can be inaccurate, please verify the information.
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              tabIndex={-1}
              className={cn(buttonVariants({ size: 'sm', color: 'ghost' }))}
            >
              <X className="size-4" />
              Close Dialog
            </DialogClose>
          </div>
        </div>
      </div>
    </ChatContext>
  );
}
