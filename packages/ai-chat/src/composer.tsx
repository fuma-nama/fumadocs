'use client';
import { useTranslations } from '@fuma-translate/react';
import { cn } from 'cn';
import { ArrowUpIcon, SquareIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { IconSwap } from './utils/motion';

/**
 * The message form, pressing its padding focuses the input.
 */
export function ChatComposer({ className, onMouseDown, ...props }: ComponentProps<'form'>) {
  return (
    <form
      className={cn(
        'flex items-end gap-1 rounded-lg border bg-fd-popover p-1.5 text-fd-popover-foreground shadow-lg shadow-black/5 transition-[border-color,box-shadow] duration-200 focus-within:border-fd-ring/40 focus-within:ring-4 focus-within:ring-fd-primary/5',
        className,
      )}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.currentTarget.querySelector('textarea')?.focus();
      }}
      {...props}
    />
  );
}

/** grows with its text, Enter submits the form */
export function ChatComposerInput({
  value,
  className,
  onKeyDown,
  ...props
}: ComponentProps<'textarea'> & { value: string }) {
  const t = useTranslations({ note: 'AI chat' });
  const shared = 'col-start-1 row-start-1 px-1.5 py-1';

  return (
    <div className={cn('grid flex-1 text-sm', className)}>
      <textarea
        aria-label={t('Message', { note: 'aria-label' })}
        rows={1}
        value={value}
        className={cn(
          shared,
          'resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none',
        )}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          // keyCode 229: Safari fires `compositionend` before this keydown, `isComposing` is already false
          if (e.defaultPrevented || e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        {...props}
      />
      <div
        aria-hidden
        className={cn(
          shared,
          'invisible max-h-40 overflow-hidden whitespace-pre-wrap wrap-break-word',
        )}
      >
        {`${value}\n`}
      </div>
    </div>
  );
}

/** sends, or stops the answer while busy */
export function ChatComposerSubmit({
  busy,
  onStop,
  disabled,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'type'> & { busy: boolean; onStop: () => void }) {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <button
      type={busy ? 'button' : 'submit'}
      aria-label={busy ? t('Stop', { note: 'aria-label' }) : t('Send', { note: 'aria-label' })}
      disabled={!busy && disabled}
      data-state={busy ? 'busy' : disabled ? 'idle' : 'ready'}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md bg-fd-primary text-fd-primary-foreground transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring active:scale-90 data-[state=idle]:bg-fd-accent data-[state=idle]:text-fd-muted-foreground motion-reduce:transition-none',
        className,
      )}
      onClick={busy ? onStop : undefined}
      {...props}
    >
      <IconSwap
        swapped={busy}
        from={<ArrowUpIcon className="size-4" strokeWidth={2.25} />}
        to={<SquareIcon className="size-3 fill-current" />}
      />
    </button>
  );
}
