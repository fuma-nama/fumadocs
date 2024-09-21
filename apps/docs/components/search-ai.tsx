'use client';
import {
  type AnswerSession,
  OramaClient,
  type Message,
} from '@oramacloud/client';
import {
  memo,
  type ReactNode,
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
import { Info, Loader2, Sparkles, X } from 'lucide-react';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import type { createProcessor } from '@/components/markdown-processor';

export function createClient(): AnswerSession {
  const client = new OramaClient({
    endpoint: 'https://cloud.orama.run/v1/indexes/fumadocs-vercel-app-kayb5v',
    api_key: 'lUf9gBNDq8BiyTG0fn4ukbc0ebHxnyLs',
  });

  return client.createAnswerSession({
    userContext:
      'The user is a web developer who knows some Next.js and React.js, but is new to Fumadocs.',
    inferenceType: 'documentation',
  });
}

let session: AnswerSession | undefined;

export function AIDialog(): React.ReactElement {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line react/hook-use-state -- rerender only
  const [_, set] = useState<unknown>();
  const containerRef = useRef<HTMLDivElement>(null);

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
          behavior: 'smooth',
        });
      }
    });

    containerRef.current.scrollTop =
      containerRef.current.scrollHeight - containerRef.current.clientHeight;

    // after animation
    setTimeout(() => {
      if (containerRef.current) observer.observe(containerRef.current);
    }, 2000);

    return () => {
      observer.disconnect();
    };
  }, []);

  const onStart = useCallback(() => {
    if (!session) return;

    const gen = session.askStream({
      term: message,
    });

    setMessage('');
    setLoading(true);

    void gen
      .then(async (res) => {
        for await (const _v of res) {
          set({});
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [message]);

  const items = session?.getMessages() ?? [];
  return (
    <>
      <p className="mb-2 inline-flex items-center gap-0.5 text-xs text-fd-muted-foreground">
        <Info className="inline size-5 shrink-0 fill-blue-500 text-fd-popover" />
        <span>
          Answers from AI may be inaccurate, please verify the information.
        </span>
      </p>
      <div
        ref={containerRef}
        className={cn(
          'mb-2 flex min-h-0 flex-1 flex-col gap-1 overflow-auto',
          items.length === 0 && 'hidden',
        )}
      >
        {items.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key -- safe
          <Message key={i} {...item} />
        ))}
      </div>
      <form
        className={cn(
          'flex flex-row items-center gap-1 rounded-lg border bg-fd-secondary transition-colors',
          loading && 'bg-fd-muted',
        )}
        onSubmit={(e) => {
          onStart();
          e.preventDefault();
        }}
      >
        <input
          value={message}
          placeholder={loading ? 'AI is answering' : 'Ask AI something'}
          disabled={loading}
          className="size-full bg-transparent px-2 py-1.5 placeholder:text-fd-muted-foreground focus-visible:outline-none"
          onChange={(e) => {
            setMessage(e.target.value);
          }}
        />
        {loading ? (
          <Loader2 className="me-2 size-5 animate-spin text-fd-muted-foreground" />
        ) : null}
      </form>
    </>
  );
}

let processor: Awaited<ReturnType<typeof createProcessor>> | undefined;
const map = new Map<string, ReactNode>();

const Message = memo((message: Message) => {
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
    <div className="rounded-lg border bg-fd-card px-2 py-1.5 text-fd-card-foreground">
      <p className="mb-1 text-sm font-medium text-fd-muted-foreground">
        {message.role}
      </p>
      <div className="prose text-sm">{rendered}</div>
    </div>
  );
});

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
        <DialogContent className="fixed left-1/2 z-50 my-[5vh] flex max-h-[90dvh] w-[98vw] max-w-screen-sm origin-left -translate-x-1/2 flex-col rounded-lg border bg-fd-popover p-2 text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in">
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
          <AIDialog />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
