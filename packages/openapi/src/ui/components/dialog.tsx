'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useTranslations } from '@/ui/client/i18n';

export const Dialog = DialogPrimitive.Root;

export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogPortal = DialogPrimitive.Portal;

export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({
  className,
  ref,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out',
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ref,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  const t = useTranslations();
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex flex-col gap-4 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border bg-fd-popover p-4 shadow-lg rounded-xl duration-200 data-[state=open]:animate-fd-dialog-in data-[state=closed]:animate-fd-dialog-out focus-visible:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={t.close}
          className={cn(
            buttonVariants({ size: 'icon-sm', color: 'ghost' }),
            'absolute end-2 top-2 text-fd-muted-foreground/70',
          )}
        >
          <X />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-1.5 text-center sm:text-start', className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ref,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ref,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-fd-muted-foreground', className)}
      {...props}
    />
  );
}
