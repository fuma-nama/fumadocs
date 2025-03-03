'use client';
import {
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
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
  type MessageRecord,
  useAI,
  useAIMessages,
} from '@/components/ai/context';
import {
  ScrollArea,
  ScrollViewport,
} from 'fumadocs-ui/components/ui/scroll-area';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  type DialogProps,
  DialogTitle,
} from '@radix-ui/react-dialog';

function SearchAIMessages() {
  const messages = useAIMessages();

  return (
    <div className="flex flex-col gap-4 p-3 pb-0">
      {messages.map((item, i) => (
        <Message key={i} message={item} />
      ))}
    </div>
  );
}

function SearchAIActions() {
  const { loading, regenerateLast, clearMessages } = useAI();
  const messages = useAIMessages();

  if (messages.length === 0) return null;
  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-fd-popover px-3 py-1.5 flex flex-row items-center justify-end gap-2 empty:hidden">
      {!loading && messages.at(-1)?.role === 'assistant' && (
        <button
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
            }),
            'text-fd-muted-foreground rounded-full gap-1.5',
          )}
          onClick={regenerateLast}
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
        onClick={clearMessages}
      >
        Clear Chat
      </button>
    </div>
  );
}

function SearchAIInput(props: FormHTMLAttributes<HTMLFormElement>) {
  const { loading, onSubmit, abortAnswer } = useAI();
  const [message, setMessage] = useState('');

  const onStart = (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage('');
    onSubmit(message);
  };

  useEffect(() => {
    if (!loading) document.getElementById('nd-ai-input')?.focus();
  }, [loading]);

  return (
    <form
      {...props}
      className={cn(
        'flex flex-row items-start rounded-xl border pe-2 bg-fd-popover text-fd-popover-foreground transition-colors shadow-lg',
        loading && 'bg-fd-muted',
        props.className,
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
        <button
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
              className: 'rounded-full mt-2 gap-2',
            }),
          )}
          onClick={abortAnswer}
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
          disabled={message.length === 0}
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
    <ScrollArea {...props}>
      <ScrollViewport ref={containerRef} className="max-h-[calc(100dvh-240px)]">
        {props.children}
      </ScrollViewport>
    </ScrollArea>
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

function Message({ message }: { message: MessageRecord }) {
  const { onSubmit } = useAI();
  const { suggestions = [], references = [] } = message;

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
        <Markdown text={message.content} />
      </div>
      {references.length > 0 ? (
        <div className="mt-2 flex flex-row flex-wrap items-center gap-1">
          {references.map((item, i) => (
            <Link
              key={i}
              href={item.url}
              className="block text-xs rounded-lg border p-3 hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-fd-muted-foreground">
                {item.description ?? 'Reference'}
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
                onSubmit(item);
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

function ShowOnMessages({ children }: { children: ReactNode }) {
  const messages = useAIMessages();

  if (messages.length === 0) return null;
  return children;
}

export default function AISearch(props: DialogProps) {
  return (
    <Dialog {...props}>
      {props.children}
      <AIProvider type="inkeep" loadEngine={props.open}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
          <DialogContent
            onOpenAutoFocus={(e) => {
              document.getElementById('nd-ai-input')?.focus();
              e.preventDefault();
            }}
            aria-describedby={undefined}
            className="fixed bottom-20 left-1/2 z-50 w-[98vw] max-w-[860px] -translate-x-1/2 focus-visible:outline-none data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
          >
            <ShowOnMessages>
              <List className="bg-fd-popover rounded-xl mb-3 border shadow-lg">
                <SearchAIMessages />
                <SearchAIActions />
              </List>
            </ShowOnMessages>
            <SearchAIInput className="rounded-b-none border-b-0" />
            <div className="flex flex-row gap-2 items-center bg-fd-muted text-fd-muted-foreground px-3 py-1.5 rounded-b-xl border-b border-x shadow-lg">
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
                className="rounded-full p-1.5 -me-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <X className="size-4" />
              </DialogClose>
            </div>
          </DialogContent>
        </DialogPortal>
      </AIProvider>
    </Dialog>
  );
}
