'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshCwIcon, SearchIcon, SquarePenIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import Link from 'fumadocs-core/link';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { DefaultChatTransport, type InferUITool, type Tool, type UIMessage } from 'ai';
import {
  ChatAction,
  ChatActions,
  ChatActivity,
  ChatComposer,
  ChatComposerInput,
  ChatComposerSubmit,
  ChatConversation,
  ChatCopyAction,
  ChatEmpty,
  ChatError,
  ChatHeader,
  ChatMarkdown,
  ChatMessage,
  ChatSuggestion,
  ChatSuggestions,
  ChatThinking,
  ChatTurn,
} from '@fumadocs/ai-chat';

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

type Chat = UseChatHelpers<ChatUIMessage>;
type SearchPart = Extract<ChatUIMessage['parts'][number], { type: 'tool-search' }>;

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: Chat;
} | null>(null);

const suggestions = ['Summarize this page', 'How do I get started?', 'What can I customize?'];

export function AISearchPanelHeader(props: ComponentProps<'div'>) {
  const { setOpen, chat } = useAISearchContext();
  const first = chat.messages.find((message) => message.role === 'user');

  return (
    <ChatHeader title={first ? textOf(first) : 'Ask AI'} {...props}>
      {first && (
        <ChatAction
          label="New chat"
          className="motion-safe:animate-fd-popover-in"
          onClick={() => {
            void chat.stop();
            chat.setMessages([]);
            focusInput();
          }}
        >
          <SquarePenIcon />
        </ChatAction>
      )}
      <ChatAction label="Close" onClick={() => setOpen(false)}>
        <XIcon />
      </ChatAction>
    </ChatHeader>
  );
}

const StorageKeyInput = '__ai_search_input';
export function AISearchInput(props: ComponentProps<'form'>) {
  const { open, chat } = useAISearchContext();
  const [input, setInput] = useState(() => localStorage.getItem(StorageKeyInput) ?? '');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = chat.status === 'streaming' || chat.status === 'submitted';

  useEffect(() => {
    if (open && !matchMedia('(pointer: coarse)').matches)
      inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <ChatComposer
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const text = input.trim();
        if (busy || text.length === 0) return;
        send(chat, text);
        setInput('');
        localStorage.removeItem(StorageKeyInput);
      }}
    >
      <ChatComposerInput
        ref={inputRef}
        id="nd-ai-input"
        value={input}
        placeholder={chat.messages.length > 0 ? 'Ask a follow-up' : 'Ask a question'}
        onChange={(e) => {
          setInput(e.target.value);
          localStorage.setItem(StorageKeyInput, e.target.value);
        }}
      />
      <ChatComposerSubmit
        busy={busy}
        disabled={input.trim().length === 0}
        onStop={() => {
          void chat.stop();
          inputRef.current?.focus();
        }}
      />
    </ChatComposer>
  );
}

function Message({
  message,
  live,
  last,
}: {
  message: ChatUIMessage;
  live: boolean;
  last: boolean;
}) {
  const { regenerate } = useChatContext();
  const text = textOf(message);
  if (message.role === 'user') return <ChatMessage from="user">{text}</ChatMessage>;

  const items: ReactNode[] = [];
  for (const [i, part] of message.parts.entries()) {
    if (part.type === 'tool-search') {
      items.push(<Search key={part.toolCallId} part={part} live={live} />);
    } else if (part.type === 'text' && part.text) {
      items.push(
        <ChatMarkdown key={i} text={part.text} live={live && part.state === 'streaming'} />,
      );
    }
  }

  return (
    <ChatMessage from="assistant">
      {items}
      {!live && text && (
        <ChatActions pinned={last}>
          <ChatCopyAction text={text} />
          {last && (
            <ChatAction label="Retry" onClick={() => regenerate()}>
              <RefreshCwIcon />
            </ChatAction>
          )}
        </ChatActions>
      )}
    </ChatMessage>
  );
}

function Search({ part, live }: { part: SearchPart; live: boolean }) {
  const done = part.state === 'output-available';
  const links: ReactNode[] = [];
  let label: ReactNode = live ? 'Searching' : 'Search stopped';
  if (part.state === 'output-error') label = <span className="text-fd-error">Search failed</span>;

  if (done) {
    label = 'Searched';
    for (const { doc } of part.output) {
      if (!doc) continue;
      links.push(
        <Link
          key={doc.url}
          href={doc.url}
          className="truncate transition-colors hover:text-fd-accent-foreground"
        >
          {doc.title}
        </Link>,
      );
    }
  }

  return (
    <ChatActivity
      icon={<SearchIcon />}
      running={live && !part.state.startsWith('output-')}
      label={label}
      detail={part.input?.query && `“${part.input.query}”`}
      meta={done && `${links.length} ${links.length === 1 ? 'result' : 'results'}`}
    >
      {links.length > 0 && links}
    </ChatActivity>
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
          'fixed bottom-4 gap-3 w-24 inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] shadow-lg z-20 transition-[translate,opacity]',
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
    <div className="flex size-full flex-col">
      <AISearchPanelHeader />
      <AISearchPanelList className="flex-1" />
      <AISearchInput className="mx-3 mb-3" />
    </div>
  );
}

export function AISearchPanelList(props: ComponentProps<'div'>) {
  const chat = useChatContext();
  const live = chat.status === 'streaming' || chat.status === 'submitted';
  const last = chat.messages.at(-1);
  const pending = live ? pendingOf(last) : undefined;
  const turns: ChatUIMessage[][] = [];
  let current: ChatUIMessage[] | undefined;

  for (const message of chat.messages) {
    if (message.role === 'system') continue;
    if (message.role === 'user' || !current) turns.push((current = [message]));
    else current.push(message);
  }

  return (
    <ChatConversation {...props}>
      {turns.length === 0 ? (
        <ChatEmpty
          title="What do you want to know?"
          description="Answers come from the docs, AI can make mistakes."
        >
          <ChatSuggestions>
            {suggestions.map((question) => (
              <ChatSuggestion
                key={question}
                onClick={() => {
                  send(chat, question);
                  focusInput();
                }}
              >
                {question}
              </ChatSuggestion>
            ))}
          </ChatSuggestions>
        </ChatEmpty>
      ) : (
        turns.map((turn, i) => {
          const latest = i === turns.length - 1;

          return (
            <ChatTurn key={turn[0]!.id}>
              {turn.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  live={live && message === last}
                  last={message === last}
                />
              ))}
              {latest && pending && <ChatThinking>{pending}</ChatThinking>}
              {latest && chat.error && (
                <ChatError onRetry={() => chat.regenerate()}>{chat.error.message}</ChatError>
              )}
            </ChatTurn>
          );
        })
      )}
    </ChatConversation>
  );
}

/** what the assistant is doing while nothing shows */
function pendingOf(message: ChatUIMessage | undefined) {
  if (message?.role !== 'assistant') return 'Thinking';
  let last: ChatUIMessage['parts'][number] | undefined;
  for (const part of message.parts) {
    if (part.type === 'tool-search' || (part.type === 'text' && part.text.length > 0)) last = part;
  }
  if (!last) return 'Thinking';
  if (last.type === 'tool-search' && last.state === 'output-available') return 'Reading results';
}

function send(chat: Chat, text: string) {
  void chat.sendMessage({
    role: 'user',
    parts: [
      {
        type: 'data-client',
        data: {
          location: location.href,
        },
      },
      {
        type: 'text',
        text,
      },
    ],
  });
}

/** the clicked button is gone, keep the focus in the chat */
function focusInput() {
  document.getElementById('nd-ai-input')?.focus();
}

function textOf(message: ChatUIMessage) {
  let text = '';
  for (const part of message.parts) {
    if (part.type === 'text') text += part.text;
  }
  return text;
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
