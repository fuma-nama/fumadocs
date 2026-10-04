'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type SyntheticEvent,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowUpIcon,
  MessageCircleIcon,
  RefreshCw,
  SearchIcon,
  SquareIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { DefaultChatTransport, type Tool, type UIMessage, type UIToolInvocation } from 'ai';
import { Markdown } from '../markdown';

export type ChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

export type SearchTool = Tool<{ query: string; limit: number }>;

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: UseChatHelpers<ChatUIMessage>;
} | null>(null);

export function AISearchPanelHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky top-0 flex items-start gap-2 border rounded-xl bg-fd-secondary text-fd-secondary-foreground',
        className,
      )}
      {...props}
    >
      <div className="px-3 py-2 flex-1">
        <p className="text-sm font-medium mb-2">AI Chat</p>
        <p className="text-xs text-fd-muted-foreground">
          AI can be inaccurate, please verify the answers.
        </p>
      </div>

      <div className="flex items-center gap-1 p-2">
        <AISearchInputActions />
      </div>
    </div>
  );
}

export function AISearchInputActions() {
  const { setOpen } = useAISearchContext();
  const { messages, status, setMessages, regenerate } = useChatContext();
  const isLoading = status === 'streaming';

  return (
    <>
      {!isLoading && messages.length > 0 && messages.at(-1)?.role === 'assistant' && (
        <button
          type="button"
          className={cn(
            buttonVariants({
              size: 'icon-xs',
              variant: 'ghost',
              className: 'text-fd-muted-foreground rounded-full',
            }),
          )}
          onClick={() => regenerate()}
        >
          <RefreshCw />
        </button>
      )}
      <button
        type="button"
        className={cn(
          buttonVariants({
            size: 'icon-xs',
            variant: 'ghost',
            className: 'text-fd-muted-foreground rounded-full',
          }),
        )}
        onClick={() => setMessages([])}
      >
        <TrashIcon />
      </button>
      <button
        aria-label="Close"
        tabIndex={-1}
        className={cn(
          buttonVariants({
            size: 'icon-xs',
            variant: 'ghost',
            className: 'text-fd-muted-foreground rounded-full',
          }),
        )}
        onClick={() => setOpen(false)}
      >
        <XIcon />
      </button>
    </>
  );
}

const StorageKeyInput = '__ai_search_input';
export function AISearchInput(props: ComponentProps<'form'>) {
  const { status, sendMessage, stop } = useChatContext();
  const [input, setInput] = useState(() => localStorage.getItem(StorageKeyInput) ?? '');
  const isLoading = status === 'streaming' || status === 'submitted';
  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault();
    void sendMessage({ text: input });
    setInput('');
    localStorage.removeItem(StorageKeyInput);
  };

  useEffect(() => {
    if (isLoading) document.getElementById('nd-ai-input')?.focus();
  }, [isLoading]);

  return (
    <form {...props} className={cn('flex items-start pe-2', props.className)} onSubmit={onStart}>
      <Input
        value={input}
        placeholder={isLoading ? 'AI is answering...' : 'Ask a question'}
        autoFocus
        disabled={status === 'streaming' || status === 'submitted'}
        onChange={(e) => {
          setInput(e.target.value);
          localStorage.setItem(StorageKeyInput, e.target.value);
        }}
        onKeyDown={(event) => {
          // keyCode 229: Safari fires `compositionend` before this keydown, `isComposing` is already false
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (!event.shiftKey && event.key === 'Enter') {
            onStart(event);
          }
        }}
      />
      {isLoading ? (
        <button
          key="bn"
          type="button"
          className={cn(
            buttonVariants({
              variant: 'secondary',
              size: 'icon-sm',
              className: 'transition-opacity rounded-full mt-2 [&_svg]:size-3',
            }),
          )}
          onClick={stop}
        >
          <SquareIcon className="fill-current" />
        </button>
      ) : (
        <button
          key="bn"
          type="submit"
          className={cn(
            buttonVariants({
              variant: 'default',
              className: 'transition-opacity rounded-full mt-2 [&_svg]:size-4',
              size: 'icon-sm',
            }),
          )}
          disabled={input.length === 0}
        >
          <ArrowUpIcon />
        </button>
      )}
    </form>
  );
}

function List(props: Omit<ComponentProps<'div'>, 'dir'>) {
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
      className={cn('fd-scroll-container overflow-y-auto min-w-0 flex flex-col', props.className)}
    >
      {props.children}
    </div>
  );
}

function Input(props: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1', props.className);

  return (
    <div className="grid flex-1 p-3">
      <textarea
        id="nd-ai-input"
        {...props}
        className={cn(
          'flex field-sizing-content resize-none min-h-11 max-h-32 w-full bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none text-base disabled:opacity-50 md:text-sm',
          shared,
        )}
      />
      <div ref={ref} className={cn(shared, 'break-all invisible')}>
        {`${props.value?.toString() ?? ''}\n`}
      </div>
    </div>
  );
}

function Message({ message, ...props }: { message: UIMessage } & ComponentProps<'div'>) {
  let markdown = '';
  const searchCalls: UIToolInvocation<SearchTool>[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'text') {
      markdown += part.text;
      continue;
    }

    if (part.type.startsWith('tool-')) {
      const toolName = part.type.slice('tool-'.length);
      const p = part as UIToolInvocation<Tool>;

      if (toolName !== 'search' || !p.toolCallId) continue;
      searchCalls.push(p);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()} {...props}>
      <div
        className={cn(
          'prose text-sm',
          message.role === 'user' &&
            'px-3 py-2 w-fit max-w-[min(100%,36rem)] rounded-2xl bg-fd-secondary ms-auto',
        )}
      >
        <Markdown text={markdown} />
      </div>

      {searchCalls.map((call) => {
        return (
          <div
            key={call.toolCallId}
            className="flex flex-row gap-2 items-center mt-3 rounded-lg border bg-fd-secondary text-fd-muted-foreground text-xs p-2"
          >
            <SearchIcon className="size-4" />
            {call.state === 'output-error' || call.state === 'output-denied' ? (
              <p className="text-fd-error">{call.errorText ?? 'Failed to search'}</p>
            ) : (
              <p>{!call.output ? 'Searching…' : `${call.output.length} search results`}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AISearch({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const chat = useChat<ChatUIMessage>({
    id: 'search',
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <Context value={useMemo(() => ({ chat, open, setOpen }), [chat, open])}>{children}</Context>
  );
}

export function AISearchTrigger({
  position = 'default',
  className,
  ...props
}: ComponentProps<'button'> & { position?: 'default' | 'float' }) {
  const { open, setOpen } = useAISearchContext();

  return (
    <button
      data-state={open ? 'open' : 'closed'}
      className={cn(
        position === 'float' && [
          'fixed bottom-4 gap-3 w-24 inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] z-20 transition-[translate,opacity]',
          open && 'translate-y-10 opacity-0',
        ],
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {props.children}
    </button>
  );
}

export function AISearchPanel() {
  return (
    <div className="flex flex-col size-full p-2">
      <AISearchPanelHeader />
      <AISearchPanelList className="flex-1" />
      <div className="rounded-xl border bg-fd-secondary text-fd-secondary-foreground">
        <AISearchInput />
      </div>
    </div>
  );
}

export function AISearchPanelList({ className, style, ...props }: ComponentProps<'div'>) {
  const chat = useChatContext();
  const messages = chat.messages.filter((msg) => msg.role !== 'system');

  return (
    <List
      className={cn('py-4 overscroll-contain', className)}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)',
        ...style,
      }}
      {...props}
    >
      {messages.length === 0 ? (
        <div className="text-sm text-fd-muted-foreground/80 size-full flex flex-col items-center justify-center text-center gap-2">
          <MessageCircleIcon fill="currentColor" stroke="none" />
          <p onClick={(e) => e.stopPropagation()}>Start a new chat below.</p>
        </div>
      ) : (
        <div className="flex flex-col px-3 gap-4">
          {messages.map((item) => (
            <Message key={item.id} message={item} />
          ))}
        </div>
      )}
    </List>
  );
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      e.preventDefault();
    }

    if (e.key === '/' && (e.metaKey || e.ctrlKey) && !open) {
      setOpen(true);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, []);
}

export function useAISearchContext() {
  return use(Context)!;
}

function useChatContext() {
  return use(Context)!.chat;
}
