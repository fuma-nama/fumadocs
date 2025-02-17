'use client';
import { cn } from '@/lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { type SyntheticEvent, useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
} from 'fumadocs-ui/components/ui/collapsible';
import { cva } from 'class-variance-authority';
import { OpenPanel } from '@openpanel/web';

const rateButtonVariants = cva(
  'inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium border bg-fd-secondary text-fd-secondary-foreground text-sm [&_svg]:size-4 disabled:cursor-not-allowed',
  {
    variants: {
      active: {
        true: 'bg-fd-accent text-fd-accent-foreground [&_svg]:fill-current',
        false: 'text-fd-muted-foreground',
      },
    },
  },
);

interface Feedback {
  opinion: 'good' | 'bad';
  message: string;
}

function get(): Feedback | null {
  const url = window.location.pathname;
  const item = localStorage.getItem(`docs-feedback-${url}`);

  if (item === null) return null;
  return JSON.parse(item) as Feedback;
}

function set(feedback: Feedback | null) {
  const url = window.location.pathname;
  const key = `docs-feedback-${url}`;

  if (feedback) localStorage.setItem(key, JSON.stringify(feedback));
  else localStorage.removeItem(key);
}

const op = new OpenPanel({
  clientId: '9d67bc83-f661-4d57-8c2e-3e0eaf98b813',
});

export function Rate() {
  const [previous, setPrevious] = useState<Feedback | null>(null);
  const [opinion, setOpinion] = useState<'good' | 'bad' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPrevious(get());
  }, []);

  function submit(e?: SyntheticEvent) {
    e?.preventDefault();

    if (opinion !== 'good' && opinion !== 'bad') return;
    const feedback: Feedback = {
      opinion,
      message,
    };

    void op.track(
      'on_rate_docs',
      feedback as unknown as Record<string, string>,
    );

    set(feedback);
    setPrevious(feedback);
    setMessage('');
    setOpinion(null);
  }

  return (
    <Collapsible
      open={opinion !== null || previous !== null}
      onOpenChange={(v) => {
        if (!v) setOpinion(null);
      }}
      className="border-y py-3"
    >
      <div className="flex flex-row items-center gap-2">
        <p className="text-sm font-medium pe-2">How is this guide?</p>
        <button
          disabled={previous !== null}
          className={cn(
            rateButtonVariants({
              active: (previous?.opinion ?? opinion) === 'good',
            }),
          )}
          onClick={() => {
            setOpinion('good');
          }}
        >
          <ThumbsUp />
          Good
        </button>
        <button
          disabled={previous !== null}
          className={cn(
            rateButtonVariants({
              active: (previous?.opinion ?? opinion) === 'bad',
            }),
          )}
          onClick={() => {
            setOpinion('bad');
          }}
        >
          <ThumbsDown />
          Bad
        </button>
      </div>
      <CollapsibleContent className="mt-3">
        {previous ? (
          <div className="px-3 py-6 flex flex-col items-center gap-3 bg-fd-card text-fd-card-foreground text-sm text-center rounded-xl text-fd-muted-foreground">
            <p>Thank you for your feedback!</p>
            <button
              className={cn(
                buttonVariants({
                  color: 'secondary',
                }),
                'text-xs',
              )}
              onClick={() => {
                setOpinion(previous?.opinion);
                set(null);
                setPrevious(null);
              }}
            >
              Submit Again?
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-2" onSubmit={submit}>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border rounded-xl bg-fd-secondary text-fd-secondary-foreground p-3 text-sm resize-none focus-visible:outline-none placeholder:text-fd-muted-foreground"
              placeholder="Leave your feedback..."
              onKeyDown={(e) => {
                if (!e.shiftKey && e.key === 'Enter') {
                  submit(e);
                }
              }}
            />
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'outline' }), 'w-fit px-4')}
            >
              Submit
            </button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
