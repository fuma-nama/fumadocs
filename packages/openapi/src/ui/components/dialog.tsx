'use client';
import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** the popup of a dialog, a window on larger screens and the full screen on smaller ones */
export function DialogPopup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <Dialog.Popup
        className={cn(
          'fixed inset-0 z-50 flex flex-col overflow-hidden bg-fd-background text-fd-foreground outline-none transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-opacity sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:shadow-2xl',
          className,
        )}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
