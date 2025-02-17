'use client';
import { cn } from '@/lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import posthog from 'posthog-js';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
} from 'fumadocs-ui/components/ui/collapsible';
import { cva } from 'class-variance-authority';

const rateButtonVariants = cva(
  'inline-flex items-center gap-2 px-3 py-2 rounded-full border bg-fd-secondary text-fd-secondary-foreground text-sm [&_svg]:size-4 disabled:cursor-not-allowed',
  {
    variants: {
      active: {
        true: 'bg-fd-primary text-fd-primary-foreground font-medium [&_svg]:fill-current',
        false: 'disabled:text-fd-muted-foreground',
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

function set(feedback: Feedback) {
  const url = window.location.pathname;

  localStorage.setItem(`docs-feedback-${url}`, JSON.stringify(feedback));
}

export function Rate() {
  const [previous, setPrevious] = useState<Feedback | null>(null);
  const [opinion, setOpinion] = useState<'good' | 'bad' | false>(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPrevious(get());
  }, []);

  return (
    <Collapsible
      open={opinion !== false || previous !== null}
      onOpenChange={(v) => {
        if (!v) setOpinion(false);
        else setOpinion('good');
      }}
    >
      <div className="flex flex-row items-center gap-2 border-y py-2">
        <p className="text-fd-muted-foreground text-sm font-medium pe-2">
          Rate this guide?
        </p>
        <button
          disabled={previous !== null}
          className={cn(
            rateButtonVariants({
              active: opinion === 'good',
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
              active: opinion === 'bad',
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
      <CollapsibleContent>
        {previous ? (
          <div className="mt-4 p-3 min-h-[100px] bg-fd-card text-fd-card-foreground text-sm text-center content-center rounded-xl text-fd-muted-foreground">
            Submitted, thank you for your feedback!
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 pt-4"
            onSubmit={(e) => {
              e.preventDefault();

              if (opinion !== 'good' && opinion !== 'bad') return;
              const feedback: Feedback = {
                opinion,
                message,
              };
              posthog.capture('on_rate_docs', feedback);
              set(feedback);
              setPrevious(feedback);
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border rounded-xl bg-fd-secondary text-fd-secondary-foreground p-3 text-sm resize-none focus-visible:outline-none placeholder:text-fd-muted-foreground"
              placeholder="Leave your feedback..."
            />
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'primary' }), 'w-fit px-4')}
            >
              Submit
            </button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
