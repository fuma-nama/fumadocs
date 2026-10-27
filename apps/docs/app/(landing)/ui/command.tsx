'use client';
import type { ComponentProps } from 'react';
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

  return (
    <div
      {...props}
      className={cn(
        'flex h-11 w-fit max-w-full items-stretch border border-lp-line-strong bg-lp-paper',
        className,
      )}
    >
      <code className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-3 font-mono text-sm whitespace-nowrap">
        <span aria-hidden className="text-lp-ink-2 select-none">
          $
        </span>
        <span>{command}</span>
        {caret && (
          <span
            aria-hidden
            className="lp-caret -ms-1.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-current"
          />
        )}
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
