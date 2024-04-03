'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';

interface PopupContextObject {
  open: boolean;
  setOpen: (open: boolean) => void;

  handleOpen: (e: React.PointerEvent) => void;
  handleClose: (e: React.PointerEvent) => void;
}

const PopupContext = React.createContext<PopupContextObject | undefined>(
  undefined,
);

function Popup({
  delay = 300,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const openTimeoutRef = React.useRef<number>();
  const closeTimeoutRef = React.useRef<number>();

  const handleOpen = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

      openTimeoutRef.current = window.setTimeout(() => {
        setOpen(true);
      }, delay);
    },
    [delay],
  );

  const handleClose = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);

      closeTimeoutRef.current = window.setTimeout(() => {
        setOpen(false);
      }, delay);
    },
    [delay],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopupContext.Provider
        value={React.useMemo(
          () => ({
            open,
            setOpen,
            handleOpen,
            handleClose,
          }),
          [handleClose, handleOpen, open],
        )}
      >
        {children}
      </PopupContext.Provider>
    </Popover>
  );
}

const PopupTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>((props, ref) => {
  const ctx = React.useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverTrigger
      ref={ref}
      onPointerEnter={ctx.handleOpen}
      onPointerLeave={ctx.handleClose}
      {...props}
    />
  );
});

PopupTrigger.displayName = 'PopupTrigger';

const PopupContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverContent
      ref={ref}
      onPointerEnter={ctx.handleOpen}
      onPointerLeave={ctx.handleClose}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
      }}
      className={cn('max-w-80', className)}
      {...props}
    />
  );
});

PopupContent.displayName = 'PopupContent';

export { Popup, PopupTrigger, PopupContent };
