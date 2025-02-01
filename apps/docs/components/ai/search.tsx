'use client';
import {
  type HTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  use,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Loader2, RefreshCw, Send, X } from 'lucide-react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { cn } from '@/lib/cn';
import { buttonVariants } from '../../../../packages/ui/src/components/ui/button';
import type { Processor } from './markdown-processor';
import Link from 'fumadocs-core/link';
import {
  AIProvider,
  Context,
  type MessageRecord,
} from '@/components/ai/context';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  type DialogProps,
  DialogTitle,
} from '@radix-ui/react-dialog';

const listeners: (() => void)[] = [];

function onUpdate() {
  for (const listener of listeners) listener();
}

function View() {
  const [_, update] = useState(0);
  const shouldFocus = useRef(false); // should focus on input on next render
  const { loading, setLoading, engine } = use(Context);

  const onTry = () => {
    if (!engine) return;

    setLoading(true);
    void engine.regenerateLast(onUpdate).finally(() => {
      setLoading(false);
    });
  };

  const onClear = () => {
    engine?.clearHistory();
    onUpdate();
  };

  const onSubmit = (message: string) => {
    if (!engine || message.length === 0) return;

    setLoading(true);
    void engine.prompt(message, onUpdate).finally(() => {
      setLoading(false);
      shouldFocus.current = true;
    });
  };

  useEffect(() => {
    const listener = () => {
      update((prev) => prev + 1);
    };

    listeners.push(listener);
    return () => {
      listeners.splice(listeners.indexOf(listener), 1);
    };
  }, []);

  useEffect(() => {
    if (shouldFocus.current) {
      document.getElementById('nd-ai-input')?.focus();
      shouldFocus.current = false;
    }
  });

  const messages = engine?.getHistory() ?? [];

  return (
    <>
      <List className={cn(messages.length === 0 && 'hidden')}>
        {messages.map((item, i) => (
          <Message key={i} message={item} onSuggestionSelected={onSubmit} />
        ))}
      </List>
      {!loading && messages.at(-1)?.role === 'assistant' ? (
        <div className="flex flex-row shrink-0 items-center gap-2 border-t p-2">
          <button
            type="button"
            className={cn(
              buttonVariants({
                color: 'secondary',
              }),
              'gap-1.5 rounded-full',
            )}
            onClick={onTry}
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({
                color: 'ghost',
              }),
              'rounded-full',
            )}
            onClick={onClear}
          >
            Clear Chat
          </button>
        </div>
      ) : null}
      {loading ? (
        <button
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
              className: 'rounded-full mx-auto my-1',
            }),
          )}
          onClick={() => {
            engine?.abortAnswer();
          }}
        >
          Abort Answer
        </button>
      ) : null}
      <AIInput loading={loading} onSubmit={onSubmit} />
    </>
  );
}

function AIInput({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (message: string) => void;
}) {
  const [message, setMessage] = useState('');

  const onStart = (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage('');
    onSubmit(message);
  };

  return (
    <form
      className={cn(
        'flex flex-row items-start rounded-b-lg border-t pe-2 transition-colors',
        loading && 'bg-fd-muted',
      )}
      onSubmit={onStart}
    >
      <Input
        value={message}
        placeholder={loading ? 'AI is answering...' : 'Ask AI something'}
        disabled={loading}
        onChange={(e) => {
          setMessage(e.target.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === 'Enter') {
            onStart();
            event.preventDefault();
          }
        }}
      />
      {loading ? (
        <Loader2 className="mt-2 size-5 animate-spin text-fd-muted-foreground" />
      ) : (
        <button
          type="submit"
          className={cn(
            buttonVariants({
              color: 'ghost',
              className: 'rounded-full mt-2 p-1.5',
            }),
          )}
          disabled={message.length === 0}
        >
          <Send className="size-4" />
        </button>
      )}
    </form>
  );
}

function List(props: HTMLAttributes<HTMLDivElement>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      const container = containerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'instant',
      });
    });

    containerRef.current.scrollTop =
      containerRef.current.scrollHeight - containerRef.current.clientHeight;

    // after animation
    setTimeout(() => {
      const element = containerRef.current?.firstElementChild;

      if (element) {
        observer.observe(element);
      }
    }, 2000);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      {...props}
      ref={containerRef}
      className={cn('min-h-0 flex-1 overflow-auto p-2', props.className)}
    >
      <div className="flex flex-col gap-1">{props.children}</div>
    </div>
  );
}

function Input(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1 max-h-60 min-h-12 px-3 py-1.5');

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
      <div ref={ref} className={cn(shared, 'invisible whitespace-pre-wrap')}>
        {`${props.value?.toString() ?? ''}\n`}
      </div>
    </div>
  );
}

let processor: Processor | undefined;
const map = new Map<string, ReactNode>();

const roleName: Record<string, string> = {
  user: 'you',
  assistant: 'fumadocs',
};

function Message({
  onSuggestionSelected,
  message,
}: {
  message: MessageRecord;
  onSuggestionSelected: (suggestion: string) => void;
}) {
  const { suggestions = [], references = [] } = message;

  return (
    <div
      className={cn(
        message.role === 'user' &&
          'bg-fd-secondary text-fd-secondary-foreground border px-2 py-1.5 rounded-xl',
      )}
    >
      <p
        className={cn(
          'mb-1 text-xs font-medium text-fd-muted-foreground',
          message.role === 'assistant' && 'text-fd-primary',
        )}
      >
        {roleName[message.role] ?? 'unknown'}
      </p>
      <div className="prose text-sm">
        <Markdown text={message.content} />
      </div>
      {references.length > 0 ? (
        <div className="mt-2 flex flex-row flex-wrap items-center gap-1">
          {references.map((item, i) => (
            <Link
              key={i}
              href={item.url}
              className="block rounded-lg border bg-fd-secondary px-2 py-1.5 text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-fd-muted-foreground">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="flex flex-row items-center gap-1 overflow-x-auto p-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  className: 'text-nowrap',
                }),
              )}
              onClick={() => {
                onSuggestionSelected(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const [currentText, setCurrentText] = useState<string>();
  const [rendered, setRendered] = useState<ReactNode>(map.get(text));

  async function run() {
    const { createProcessor } = await import('./markdown-processor');

    processor ??= createProcessor();
    let result = map.get(text);

    if (!result) {
      result = await processor
        .process(text, {
          ...defaultMdxComponents,
          img: undefined, // use JSX
        })
        .catch(() => text);
    }

    map.set(text, result);
    setRendered(result);
  }

  if (text !== currentText) {
    setCurrentText(text);
    void run();
  }

  return rendered ?? text;
}

export default function AISearch(props: DialogProps) {
  return (
    <Dialog {...props}>
      {props.children}
      <AIProvider type="inkeep" loadEngine={props.open}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
          <DialogContent
            onOpenAutoFocus={(e) => {
              document.getElementById('nd-ai-input')?.focus();
              e.preventDefault();
            }}
            aria-describedby={undefined}
            className="fixed left-1/2 z-50 my-[5vh] flex max-h-[90dvh] w-[98vw] max-w-[860px] -translate-x-1/2 flex-col rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
          >
            <div className="bg-fd-muted px-2.5 py-2">
              <DialogTitle className="text-sm w-fit bg-fd-primary text-fd-primary-foreground px-1 font-mono font-medium">
                Prompt AI
              </DialogTitle>
              <p className="mt-2 text-xs text-fd-muted-foreground">
                Answers from AI may be inaccurate, please verify the
                information.
              </p>
            </div>
            <DialogClose
              aria-label="Close Dialog"
              tabIndex={-1}
              className="absolute right-1 top-1 rounded-full p-1.5 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <X className="size-4" />
            </DialogClose>
            <View />
          </DialogContent>
        </DialogPortal>
      </AIProvider>
    </Dialog>
  );
}
