'use client';
import type { AnswerSession, Message } from '@oramacloud/client';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
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
import { Info, Loader2, RefreshCw, Send, X } from 'lucide-react';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import type { createProcessor } from '@/components/markdown-processor';

type RelatedQueryListener = (queries: string[]) => void;
type MessageChangeListener = (messages: Message[]) => void;
let relatedQueryListeners: RelatedQueryListener[] = [];
let messageListeners: MessageChangeListener[] = [];

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      color: {
        outline: 'border hover:bg-fd-accent hover:text-fd-accent-foreground',
        ghost: 'hover:bg-fd-accent hover:text-fd-accent-foreground',
        secondary:
          'border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
      },
      size: {
        sm: 'gap-1 p-0.5 text-xs',
        icon: 'p-1.5 [&_svg]:size-5',
      },
    },
  },
);

export async function createClient(): Promise<AnswerSession> {
  const endpoint = process.env.NEXT_PUBLIC_ORAMA_ENDPOINT,
    apiKey = process.env.NEXT_PUBLIC_ORAMA_API_KEY;

  if (!endpoint || !apiKey) throw new Error('Failed to find api keys');

  const { OramaClient } = await import('@oramacloud/client');
  const client = new OramaClient({
    endpoint,
    api_key: apiKey,
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
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);

  useEffect(() => {
    // preload processor
    void import('./markdown-processor');

    if (!session) {
      void createClient().then((res) => {
        session = res;
      });
    }

    const onRelatedQuery: RelatedQueryListener = (params) => {
      setRelatedQueries(params);
    };

    const onMessageChange: MessageChangeListener = () => {
      update({});
    };

    messageListeners.push(onMessageChange);
    relatedQueryListeners.push(onRelatedQuery);

    return () => {
      messageListeners = messageListeners.filter((l) => l !== onMessageChange);
      relatedQueryListeners = relatedQueryListeners.filter(
        (l) => l !== onRelatedQuery,
      );
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

  const onTry = useCallback(() => {
    if (!session) return;

    setLoading(true);
    void session.regenerateLast({ stream: false }).finally(() => {
      setLoading(false);
    });
  }, []);

  const onClear = useCallback(() => {
    session?.clearSession();
    update({});
    shouldFocus.current = true;
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
      <List className={cn(messages.length === 0 && 'hidden')}>
        {messages.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key -- safe
          <Message key={i} {...item}>
            {!loading &&
            item.role === 'assistant' &&
            i === messages.length - 1 ? (
              <div className="mt-2 flex flex-row items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    buttonVariants({
                      color: 'secondary',
                      className: 'gap-1.5',
                    }),
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
                  )}
                  onClick={onClear}
                >
                  Clear Messages
                </button>
              </div>
            ) : null}
          </Message>
        ))}
      </List>
      {relatedQueries.length > 0 ? (
        <div className="flex flex-row items-center gap-1 overflow-x-auto p-1">
          {relatedQueries.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                buttonVariants({
                  color: 'outline',
                  className: 'py-1 text-nowrap',
                }),
              )}
              onClick={() => {
                shouldFocus.current = true;
                setMessage(item);
              }}
            >
              {item}
            </button>
          ))}
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
            session?.abortAnswer();
          }}
        >
          Abort Answer
        </button>
      ) : null}
      <form
        className={cn(
          'flex flex-row rounded-b-lg border-t pe-2 transition-colors',
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
                size: 'sm',
                color: 'ghost',
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

function List(props: HTMLAttributes<HTMLDivElement>): React.ReactElement {
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
      className={cn('min-h-0 flex-1 overflow-auto px-2 pb-2', props.className)}
    >
      <div className="flex flex-col gap-1">{props.children}</div>
    </div>
  );
}

function Input(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
): React.ReactElement {
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

let processor: Awaited<ReturnType<typeof createProcessor>> | undefined;
const map = new Map<string, ReactNode>();

const Message = memo(
  ({ children, ...message }: Message & { children: ReactNode }) => {
    const [rendered, setRendered] = useState<ReactNode>(
      map.get(message.content) ?? message.content,
    );

    useEffect(() => {
      const loadProcessor = import('./markdown-processor').then(
        (res) => res.createProcessor,
      );

      const run = async (): Promise<void> => {
        processor ??= (await loadProcessor)();
        const nodes = processor.parse({ value: message.content });
        const hast = await processor.run(nodes);
        const result = toJsxRuntime(hast, {
          development: false,
          jsx: jsx as Jsx,
          jsxs: jsxs as Jsx,
          Fragment,
          // @ts-expect-error -- safe to use
          components: {
            ...defaultMdxComponents,
            img: undefined, // use JSX
          },
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

export function Trigger(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger {...props} />
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-fd-background/50 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
        <DialogContent
          onOpenAutoFocus={(e) => {
            document.getElementById('nd-ai-input')?.focus();
            e.preventDefault();
          }}
          className="fixed left-1/2 z-50 my-[5vh] flex max-h-[90dvh] w-[98vw] max-w-[860px] origin-left -translate-x-1/2 flex-col rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
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
