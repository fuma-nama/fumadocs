'use client';
import type { ComponentProps, ReactNode } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/lib/cn';
import { setStatus } from '../lib/status';

interface CommandProps extends ComponentProps<'div'> {
  command: string;
  /** a blinking caret after the command */
  caret?: boolean;
}

/** a shell command with a copy button */
export function Command({ command, caret = false, className, ...props }: CommandProps) {
  const [copied, onCopy] = useCopyButton(async () => {
    await navigator.clipboard.writeText(command);
    setStatus(`copied ${command}`);
  });

  // a box too narrow for the command wraps it between its words, never inside one, the lines hung
  // after the prompt; the caret stays on the last word
  const words: ReactNode[] = [];
  const parts = command.split(' ');
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    words.push(
      <span key={i} className="whitespace-nowrap">
        {parts[i]}
        {last && caret && (
          <span
            aria-hidden
            className="lp-caret ms-0.5 inline-block h-[1.1em] w-[0.55em] align-text-bottom bg-current"
          />
        )}
      </span>,
    );
    if (!last) words.push(' ');
  }

  return (
    <div
      {...props}
      className={cn(
        'flex min-h-11 w-fit max-w-full items-stretch border border-lp-line-strong bg-lp-paper',
        className,
      )}
    >
      <code className="flex min-w-0 flex-1 items-baseline gap-2 px-3 py-[11px] font-mono text-sm leading-5">
        <span aria-hidden className="text-lp-ink-2 select-none">
          $
        </span>
        <span className="min-w-0">{words}</span>
      </code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? 'Copied' : `Copy "${command}"`}
        className="flex w-11 shrink-0 items-center justify-center border-s border-lp-line-strong transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
      >
        {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
      </button>
    </div>
  );
}
