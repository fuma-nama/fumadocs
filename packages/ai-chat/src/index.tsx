'use client';
import type { UseChatHelpers } from '@ai-sdk/react';
import { Collapsible } from '@base-ui/react/collapsible';
import { Tooltip } from '@base-ui/react/tooltip';
import { useTranslations } from '@fuma-translate/react';
import type { UIMessage } from 'ai';
import Link from 'fumadocs-core/link';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  SquareIcon,
  SquarePenIcon,
  XIcon,
} from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  Fragment,
  memo,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Conversation, Turn } from './conversation';
import { Markdown } from './markdown';
import { cn } from './cn';

/** the page a question is asked from, sent as a `data-client` part */
export interface AIChatClientData {
  location: string;
  title: string;
}

export interface AIChatOptions<Message extends UIMessage = UIMessage> {
  chat: UseChatHelpers<Message>;
  /** the message to send for a question, defaults to its text with `AIChatClientData` */
  toMessage?: (text: string) => Parameters<UseChatHelpers<Message>['sendMessage']>[0];
  /** renders a part other than text, such as a tool call, keep it stable so settled messages skip re-rendering */
  renderPart?: (part: Message['parts'][number], live: boolean) => ReactNode;
  /** under the title of a new chat */
  description?: ReactNode;
  suggestions?: string[];
}

interface ChatState extends AIChatOptions {
  busy: boolean;
  send: (text: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

// separate from the chat, so layouts reading `open` skip the updates of a streaming answer
const OpenContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);
const ChatContext = createContext<ChatState | null>(null);

/**
 * The chat state, `Ctrl + /` opens it and `Escape` closes it.
 */
export function AIChatProvider<Message extends UIMessage>({
  children,
  ...options
}: AIChatOptions<Message> & { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openState = useMemo(() => ({ open, setOpen }), [open]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { chat, toMessage } = options as unknown as AIChatOptions;

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      e.preventDefault();
    } else if (e.key === '/' && (e.metaKey || e.ctrlKey) && !open) {
      setOpen(true);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <OpenContext value={openState}>
      <ChatContext
        value={{
          ...(options as unknown as AIChatOptions),
          busy: chat.status === 'streaming' || chat.status === 'submitted',
          send: (text) =>
            void chat.sendMessage(
              toMessage?.(text) ?? {
                role: 'user',
                parts: [
                  {
                    type: 'data-client',
                    data: {
                      location: location.href,
                      title: document.title,
                    } satisfies AIChatClientData,
                  },
                  { type: 'text', text },
                ],
              },
            ),
          inputRef,
        }}
      >
        {children}
      </ChatContext>
    </OpenContext>
  );
}

/** whether the chat is open */
export function useAIChat() {
  return use(OpenContext)!;
}

function useChatState() {
  return use(ChatContext)!;
}

/** the chat panel, for the `aiChat` option of docs layouts */
export function AIChatPanel() {
  return (
    <div className="flex size-full flex-col">
      <AIChatHeader />
      <AIChatMessages className="flex-1" />
      <AIChatInput className="mx-3 mb-3" />
    </div>
  );
}

export function AIChatHeader() {
  const { setOpen } = useAIChat();
  const { chat, inputRef } = useChatState();
  const t = useTranslations({ note: 'AI chat' });
  const first = chat.messages.find((message) => message.role === 'user');
  const title = first ? textOf(first) : t('Ask AI');

  return (
    <div className="flex h-12 shrink-0 items-center gap-0.5 ps-3 pe-1.5">
      <p
        key={title}
        className="flex-1 truncate text-sm text-fd-muted-foreground motion-safe:animate-fd-roll-in"
      >
        {title}
      </p>
      {first && (
        <Action
          label={t('New chat')}
          className="motion-safe:animate-fd-popover-in"
          onClick={() => {
            void chat.stop();
            chat.setMessages([]);
            inputRef.current?.focus();
          }}
        >
          <SquarePenIcon />
        </Action>
      )}
      <Action label={t('Close')} onClick={() => setOpen(false)}>
        <XIcon />
      </Action>
    </div>
  );
}

export function AIChatMessages({ className }: { className?: string }) {
  const { chat, busy, renderPart, description, suggestions, send, inputRef } = useChatState();
  const t = useTranslations({ note: 'AI chat' });
  const last = chat.messages.at(-1);
  const turns: UIMessage[][] = [];
  let current: UIMessage[] | undefined;

  for (const message of chat.messages) {
    if (message.role === 'system') continue;
    if (message.role === 'user' || !current) turns.push((current = [message]));
    else current.push(message);
  }

  if (turns.length === 0) {
    return (
      <Conversation className={className}>
        <div className="mt-auto flex flex-col">
          <p className="text-lg font-medium tracking-tight motion-safe:animate-fd-roll-in">
            {t('What do you want to know?')}
          </p>
          <p
            className="mt-1 text-sm text-fd-muted-foreground motion-safe:animate-fd-roll-in"
            style={stagger()}
          >
            {description ?? t('Answers come from the docs, AI can make mistakes.')}
          </p>
          <ul
            aria-label={t('Suggestions', { note: 'aria-label' })}
            className="mt-4 flex flex-wrap gap-1.5"
          >
            {(
              suggestions ?? [
                t('Summarize this page'),
                t('How do I get started?'),
                t('What can I customize?'),
              ]
            ).map((question) => (
              <li key={question} className="motion-safe:animate-fd-roll-in" style={stagger(100)}>
                <button
                  type="button"
                  className="flex h-7 items-center rounded-lg border px-3 text-[13px] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
                  onClick={() => {
                    send(question);
                    inputRef.current?.focus();
                  }}
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Conversation>
    );
  }

  return (
    <Conversation className={className}>
      {turns.map((turn, i) => {
        const latest = i === turns.length - 1;

        return (
          <Turn key={turn[0]!.id}>
            {turn.map((message) => (
              <Message
                key={message.id}
                message={message}
                live={busy && message === last}
                last={message === last}
                renderPart={renderPart}
                onRetry={chat.regenerate}
              />
            ))}
            {latest && busy && isPending(last) && <Thinking />}
            {latest && chat.error && (
              <Failure reason={chat.error.message} onRetry={() => chat.regenerate()} />
            )}
          </Turn>
        );
      })}
    </Conversation>
  );
}

const StorageKey = '__ai_search_input';
const field = 'col-start-1 row-start-1 px-1.5 py-1';

/** the question form, its draft survives reloads */
export function AIChatInput({ className }: { className?: string }) {
  const { open } = useAIChat();
  const { chat, busy, send, inputRef } = useChatState();
  const t = useTranslations({ note: 'AI chat' });
  const [input, setInput] = useState('');
  const text = input.trim();

  function update(value: string) {
    setInput(value);
    localStorage.setItem(StorageKey, value);
  }

  // read after hydration, as the server has no drafts
  useEffect(() => {
    const draft = localStorage.getItem(StorageKey);
    if (draft) setInput(draft);
  }, []);

  useEffect(() => {
    if (open && !matchMedia('(pointer: coarse)').matches)
      inputRef.current?.focus({ preventScroll: true });
  }, [open, inputRef]);

  return (
    <form
      className={cn(
        'flex items-end gap-1 rounded-lg border bg-fd-popover p-1.5 text-fd-popover-foreground shadow-lg shadow-black/5 transition-[border-color,box-shadow] duration-200 focus-within:border-fd-ring/40 focus-within:ring-4 focus-within:ring-fd-primary/5',
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (busy || !text) return;
        send(text);
        update('');
      }}
      // pressing the padding focuses the input
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <div className="grid flex-1 text-sm">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          aria-label={t('Message', { note: 'aria-label' })}
          placeholder={chat.messages.length > 0 ? t('Ask a follow-up') : t('Ask a question')}
          className={cn(
            field,
            'resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none',
          )}
          onChange={(e) => update(e.target.value)}
          onKeyDown={(e) => {
            // keyCode 229: Safari fires `compositionend` before this keydown, `isComposing` is already false
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div
          aria-hidden
          className={cn(
            field,
            'invisible max-h-40 overflow-hidden whitespace-pre-wrap wrap-break-word',
          )}
        >
          {`${input}\n`}
        </div>
      </div>
      <button
        type={busy ? 'button' : 'submit'}
        aria-label={busy ? t('Stop', { note: 'aria-label' }) : t('Send', { note: 'aria-label' })}
        disabled={!busy && !text}
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-fd-primary text-fd-primary-foreground transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring active:scale-90 disabled:bg-fd-accent disabled:text-fd-muted-foreground motion-reduce:transition-none"
        onClick={
          busy
            ? () => {
                void chat.stop();
                inputRef.current?.focus();
              }
            : undefined
        }
      >
        <IconSwap
          swapped={busy}
          from={<ArrowUpIcon className="size-4" strokeWidth={2.25} />}
          to={<SquareIcon className="size-3 fill-current" />}
        />
      </button>
    </form>
  );
}

/** a floating button that toggles the chat */
export function AIChatTrigger({ className }: { className?: string }) {
  const { open, setOpen } = useAIChat();
  const t = useTranslations({ note: 'AI chat' });

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant: 'secondary' }),
        'fixed inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] bottom-4 z-20 gap-2 rounded-2xl text-fd-muted-foreground shadow-lg transition-[translate,opacity] motion-reduce:transition-none',
        open && 'translate-y-10 opacity-0',
        className,
      )}
      inert={open}
      onClick={() => setOpen(!open)}
    >
      <MessageCircleIcon className="size-4.5" />
      {t('Ask AI')}
    </button>
  );
}

export function AIChatSources({
  sources,
}: {
  sources: { url: string; title?: string | null; label?: string | null }[];
}) {
  const t = useTranslations({ note: 'AI chat' });
  if (sources.length === 0) return null;

  return (
    <ol aria-label={t('Sources', { note: 'aria-label' })} className="flex flex-wrap gap-1.5">
      {sources.map((source, i) => (
        <li key={i} className="motion-safe:animate-fd-roll-in" style={stagger()}>
          <Link
            href={source.url}
            className="flex h-7 max-w-56 items-center gap-1.5 rounded-lg border bg-fd-card ps-1.5 pe-2 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-md bg-fd-secondary px-1 font-mono text-[10.5px] tabular-nums">
              {source.label ?? i + 1}
            </span>
            <span className="truncate">{source.title ?? source.url}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** a call of the docs search tool, expandable to the found pages */
export function AIChatSearch({
  part,
  live,
}: {
  part: {
    state: string;
    input?: { query?: string };
    output?: { doc?: { url: string; title: string } | null }[];
  };
  live: boolean;
}) {
  const t = useTranslations({ note: 'AI chat' });
  const done = part.state === 'output-available';
  const running = live && !part.state.startsWith('output-');
  const links: ReactNode[] = [];
  let label: ReactNode = live ? t('Searching') : t('Search stopped');
  if (part.state === 'output-error')
    label = <span className="text-fd-error">{t('Search failed')}</span>;

  if (done) {
    label = t('Searched');
    for (const { doc } of part.output ?? []) {
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
    <Collapsible.Root disabled={links.length === 0} className="motion-safe:animate-fd-fade-in">
      <Collapsible.Trigger className="group/trigger -ms-1 flex max-w-full items-center gap-2 rounded-md py-0.5 ps-1 pe-1.5 text-start text-sm text-fd-muted-foreground transition-colors not-data-disabled:hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring">
        <span className="flex w-4 shrink-0 justify-center [&_svg]:size-3.5">
          {running ? <Spinner /> : <SearchIcon />}
        </span>
        <span className={cn('shrink-0', running && 'motion-safe:animate-pulse')}>{label}</span>
        {part.input?.query && (
          <span className="truncate text-fd-muted-foreground/75">“{part.input.query}”</span>
        )}
        {done && (
          <span className="shrink-0 text-xs text-fd-muted-foreground/75 tabular-nums">
            {links.length === 1
              ? t('1 result')
              : t('{count} results', { variables: { count: String(links.length) } })}
          </span>
        )}
        <ChevronRightIcon className="size-3.5 shrink-0 opacity-50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-disabled/trigger:hidden group-data-panel-open/trigger:rotate-90 rtl:rotate-180 motion-reduce:transition-none" />
      </Collapsible.Trigger>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none">
        <div className="ms-[7.5px] mt-1.5 flex flex-col gap-1 border-s ps-4 pb-1 text-xs text-fd-muted-foreground">
          {links}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** memoized, as settled messages keep their identity while an answer streams */
const Message = memo(function Message({
  message,
  live,
  last,
  renderPart,
  onRetry,
}: {
  message: UIMessage;
  live: boolean;
  last: boolean;
  renderPart: AIChatOptions['renderPart'];
  onRetry: () => unknown;
}) {
  const t = useTranslations({ note: 'AI chat' });
  const text = textOf(message);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end motion-safe:animate-fd-roll-in">
        <p className="max-w-[85%] rounded-xl bg-fd-secondary px-3 py-1.5 text-sm whitespace-pre-wrap wrap-break-word text-fd-secondary-foreground">
          {text}
        </p>
      </div>
    );
  }

  const items: ReactNode[] = [];
  for (const [i, part] of message.parts.entries()) {
    if (part.type !== 'text') items.push(<Fragment key={i}>{renderPart?.(part, live)}</Fragment>);
    else if (part.text)
      items.push(<Markdown key={i} text={part.text} live={live && part.state === 'streaming'} />);
  }

  return (
    <div className="group/message flex flex-col gap-3 empty:hidden">
      {items}
      {!live && text && (
        <div
          className={cn(
            '-ms-1.25 -mt-1 flex items-center motion-safe:animate-fd-fade-in',
            !last &&
              'opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100',
          )}
        >
          <CopyAction text={text} className={small} />
          {last && (
            <Action label={t('Retry')} className={small} onClick={() => void onRetry()}>
              <RefreshCwIcon />
            </Action>
          )}
        </div>
      )}
    </div>
  );
});

const small = 'size-6 [&_svg]:size-3.5';

/** nothing shows yet, or the model reads what a tool returned */
function isPending(message: UIMessage | undefined) {
  const part = message?.role === 'assistant' ? message.parts.at(-1) : undefined;
  if (part?.type === 'text') return part.text.length === 0;
  if (part && 'toolCallId' in part) return part.state.startsWith('output-');
  return true;
}

/** shown a beat late, so quick answers never flash it */
function Thinking() {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <div
      role="status"
      className="flex items-center gap-2 text-sm text-fd-muted-foreground motion-safe:animate-fd-fade-in"
      style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
    >
      <Spinner />
      <span className="motion-safe:animate-pulse">{t('Thinking')}</span>
    </div>
  );
}

function Failure({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg bg-fd-error/5 py-2 ps-3 pe-2 text-sm ring-1 ring-fd-error/15 motion-safe:animate-fd-roll-in"
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-fd-error" />
      <div className="min-w-0 flex-1">
        <p>{t('Something went wrong.')}</p>
        <p className="line-clamp-2 text-xs wrap-break-word text-fd-muted-foreground">{reason}</p>
      </div>
      <button
        type="button"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
        onClick={onRetry}
      >
        {t('Try again')}
      </button>
    </div>
  );
}

function Action({
  label,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'aria-label'> & { label: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label={label}
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'size-7 p-0 text-fd-muted-foreground [&_svg]:size-4',
          className,
        )}
        {...props}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={6} className="z-50">
          <Tooltip.Popup className="origin-(--transform-origin) rounded-md border bg-fd-popover px-2 py-1 text-xs text-fd-popover-foreground shadow-md transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function CopyAction({ text, className }: { text: string; className?: string }) {
  const t = useTranslations({ note: 'AI chat' });
  const [checked, onClick] = useCopyButton(() => navigator.clipboard.writeText(text));

  return (
    <Action label={checked ? t('Copied') : t('Copy')} className={className} onClick={onClick}>
      <IconSwap swapped={checked} from={<CopyIcon />} to={<CheckIcon />} />
    </Action>
  );
}

function IconSwap({ swapped, from, to }: { swapped: boolean; from: ReactNode; to: ReactNode }) {
  const layer =
    'col-start-1 row-start-1 flex transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
  const hidden = 'scale-50 opacity-0 blur-[2px]';

  return (
    <span className="inline-grid place-items-center">
      <span aria-hidden={swapped} className={cn(layer, swapped && hidden)}>
        {from}
      </span>
      <span aria-hidden={!swapped} className={cn(layer, !swapped && hidden)}>
        {to}
      </span>
    </span>
  );
}

const orbit = [1.6, 1.35, 1.15, 1, 0.85, 0.72, 0.6].map((r, i) => {
  const angle = (-i * 32 * Math.PI) / 180;
  return { cx: 8 + 5.5 * Math.sin(angle), cy: 8 - 5.5 * Math.cos(angle), r, opacity: 1 - i * 0.12 };
});

function Spinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4 shrink-0 text-fd-primary motion-safe:animate-spin motion-safe:[animation-duration:1.2s]"
    >
      {orbit.map((dot, i) => (
        <circle key={i} {...dot} fill="currentColor" />
      ))}
    </svg>
  );
}

function stagger(base = 0): CSSProperties {
  return {
    animationDelay: `calc(${base}ms + (sibling-index() - 1) * 50ms)`,
    animationFillMode: 'backwards',
  };
}

function textOf(message: UIMessage) {
  let text = '';
  for (const part of message.parts) {
    if (part.type === 'text') text += part.text;
  }
  return text;
}
