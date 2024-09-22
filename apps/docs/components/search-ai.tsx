'use client';
import {
  type AnswerSession,
  OramaClient,
  type Message,
} from '@oramacloud/client';
import {
  memo,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@radix-ui/react-dialog';
import { Info, Loader2, Send, Sparkles, X } from 'lucide-react';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import type { createProcessor } from '@/components/markdown-processor';

type RelatedQueryListener = (queries: string[]) => void;
type MessageChangeListener = (messages: Message[]) => void;
let relatedQueryListeners: RelatedQueryListener[] = [];
let messageListeners: MessageChangeListener[] = [];

export function createClient(): AnswerSession {
  const client = new OramaClient({
    endpoint: 'https://cloud.orama.run/v1/indexes/fumadocs-vercel-app-kayb5v',
    api_key: 'lUf9gBNDq8BiyTG0fn4ukbc0ebHxnyLs',
  });

  const instance = client.createAnswerSession({
    userContext:
      'The user is a web developer who knows some Next.js and React.js, but is new to Fumadocs.',
    events: {
      onRelatedQueries(params) {
        relatedQueryListeners.forEach((l) => {
          l(params);
        });
      },
      onStateChange() {
        messageListeners.forEach((l) => {
          l(instance.getMessages());
        });
      },
    },
    inferenceType: 'documentation',
  });

  return instance;
}

let session: AnswerSession | undefined;

export function AIDialog(): React.ReactElement {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line react/hook-use-state -- rerender
  const [_, update] = useState<unknown>();
  const shouldFocus = useRef(false); // should focus on input on next render
  const containerRef = useRef<HTMLDivElement>(null);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);

  useEffect(() => {
    session ??= createClient();

    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      const container = containerRef.current;
      if (!container) return;

      if (
        container.scrollTop >=
        container.scrollHeight - container.clientHeight - 50
      ) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'instant',
        });
      }
    });

    const onRelatedQuery: RelatedQueryListener = (params) => {
      setRelatedQueries(params);
    };

    const onMessageChange: MessageChangeListener = () => {
      update({});
    };

    messageListeners.push(onMessageChange);
    relatedQueryListeners.push(onRelatedQuery);

    containerRef.current.scrollTop =
      containerRef.current.scrollHeight - containerRef.current.clientHeight;

    // after animation
    setTimeout(() => {
      if (containerRef.current) observer.observe(containerRef.current);
    }, 2000);

    return () => {
      messageListeners = messageListeners.filter((l) => l !== onMessageChange);
      relatedQueryListeners = relatedQueryListeners.filter(
        (l) => l !== onRelatedQuery,
      );
      observer.disconnect();
    };
  }, []);

  const onStart = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!session || message.length === 0) return;

      const gen = session.ask({
        term: message,
        related: {
          howMany: 3,
          format: 'query',
        },
      });

      setMessage('');
      setLoading(true);
      void gen.finally(() => {
        setLoading(false);
        shouldFocus.current = true;
      });
    },
    [message],
  );

  const onRegenerate = useCallback(() => {
    if (!session) return;

    setLoading(true);
    void session.regenerateLast({ stream: false }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (shouldFocus.current) {
      document.getElementById('nd-ai-input')?.focus();
      shouldFocus.current = false;
    }
  });

  const messages = session?.getMessages() ?? [];

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'mb-2 flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-2',
          messages.length === 0 && 'hidden',
        )}
      >
        {messages.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key -- safe
          <Message key={i} {...item}>
            {!loading && i === messages.length - 1 ? (
              <button
                type="button"
                className={cn(
                  buttonVariants({
                    size: 'sm',
                    variant: 'secondary',
                    className: 'mt-2',
                  }),
                )}
                onClick={onRegenerate}
              >
                Re-generate answer
              </button>
            ) : null}
          </Message>
        ))}
      </div>
      {relatedQueries.length > 0 ? (
        <div className="flex flex-row items-center gap-2">
          {relatedQueries.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              onClick={() => {
                setMessage(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className={cn(
          'flex flex-row gap-1 rounded-b-lg bg-fd-secondary pe-2 text-fd-secondary-foreground transition-colors',
          loading && 'bg-fd-muted',
        )}
        onSubmit={onStart}
      >
        <Input
          value={message}
          placeholder={loading ? 'AI is answering' : 'Ask AI something'}
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
                size: 'sm',
                variant: 'ghost',
                className: 'rounded-full p-1',
              }),
            )}
            disabled={message.length === 0}
          >
            <Send className="size-4" />
          </button>
        )}
      </form>
    </>
  );
}

function Input(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1 max-h-60 min-h-12 px-2 py-1.5');

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

let processor: Awaited<ReturnType<typeof createProcessor>> | undefined;
const map = new Map<string, ReactNode>();

const Message = memo(
  ({ children, ...message }: Message & { children: ReactNode }) => {
    const [rendered, setRendered] = useState<ReactNode>(
      map.get(message.content) ?? message.content,
    );

    useEffect(() => {
      const run = async (): Promise<void> => {
        const { createProcessor } = await import('./markdown-processor');
        processor ??= await createProcessor();
        const nodes = processor.parse({ value: message.content });
        const hast = await processor.run(nodes);
        const result = toJsxRuntime(hast, {
          development: false,
          jsx: jsx as Jsx,
          jsxs: jsxs as Jsx,
          Fragment,
          // @ts-expect-error -- safe to use
          components: defaultMdxComponents,
        });

        map.set(message.content, result);
        setRendered(result);
      };

      void run();
    }, [message.content]);

    return (
      <div
        className={cn(
          'rounded-lg border bg-fd-card px-2 py-1.5 text-fd-card-foreground',
          message.role === 'user' &&
            'bg-fd-secondary text-fd-secondary-foreground',
        )}
      >
        <p
          className={cn(
            'mb-1 text-xs font-medium text-fd-muted-foreground',
            message.role === 'assistant' && 'text-fd-primary',
          )}
        >
          {message.role}
        </p>
        <div className="prose text-sm">{rendered}</div>
        {children}
      </div>
    );
  },
);

Message.displayName = 'Message';

export function Trigger(): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'rounded-full gap-1.5',
          }),
        )}
      >
        <Sparkles className="size-4" />
        Ask AI
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-fd-background/50 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
        <DialogContent
          onOpenAutoFocus={(e) => {
            document.getElementById('nd-ai-input')?.focus();
            e.preventDefault();
          }}
          className="fixed left-1/2 z-50 my-[5vh] flex max-h-[90dvh] w-[98vw] max-w-screen-sm origin-left -translate-x-1/2 flex-col rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
        >
          <DialogTitle className="sr-only">Search AI</DialogTitle>
          <DialogDescription className="sr-only">
            Ask AI some questions.
          </DialogDescription>
          <DialogClose
            aria-label="Close Dialog"
            tabIndex={-1}
            className={cn(
              'absolute right-1 top-1 rounded-full bg-fd-muted p-1 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
            )}
          >
            <X className="size-4" />
          </DialogClose>
          <p className="inline-flex items-center gap-0.5 p-2 text-xs text-fd-muted-foreground">
            <Info className="inline size-5 shrink-0 fill-blue-500 text-fd-popover" />
            <span>
              Answers from AI may be inaccurate, please verify the information.
            </span>
          </p>
          <AIDialog />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
