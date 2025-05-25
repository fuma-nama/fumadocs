'use client';
import { type ButtonHTMLAttributes, useState } from 'react';
import dynamic from 'next/dynamic';
import { cx } from '@/lib/cvb.config';
import { buttonVariants } from '../../../../packages/ui/src/components/ui/button';

// lazy load the dialog
const SearchAI = dynamic(() => import('./search'), { ssr: false });

/**
 * The trigger component for AI search dialog.
 *
 * Use it like a normal button component.
 */
export function AISearchTrigger(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const [open, setOpen] = useState<boolean>();

  return (
    <>
      {open !== undefined ? (
        <SearchAI open={open} onOpenChange={setOpen} />
      ) : null}
      <button
        {...props}
        onClick={() => setOpen(true)}
        className={cx(
          buttonVariants({
            color: 'secondary',
          }),
          'fixed bottom-4 right-4 z-10 gap-2 rounded-xl bg-fd-secondary/50 text-fd-secondary-foreground/80 shadow-lg backdrop-blur-lg md:bottom-8 md:right-8',
          props.className,
        )}
      />
    </>
  );
}
