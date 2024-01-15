'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn';

const TIMING_FUNCTION = 'cubic-bezier(0.32, 0.72, 0, 1)';

const Context = React.createContext<{
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {
    throw new Error();
  },
});

function Drawer({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>): JSX.Element {
  const openState = React.useState(false);
  const isOpen = open ?? openState[0];
  const setIsOpen = onOpenChange ?? openState[1];

  return (
    <Context.Provider value={{ isOpen, setIsOpen }}>
      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen} {...props} />
    </Context.Provider>
  );
}

Drawer.displayName = 'Drawer';

const DrawerTrigger = DialogPrimitive.Trigger;

const DrawerPortal = DialogPrimitive.Portal;

const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-background/50', className)}
    {...props}
  />
));

DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { setIsOpen } = React.useContext(Context);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const mergedRefs = mergeRefs(ref, contentRef);

  const getOffset = (): number => {
    return Number(
      contentRef.current?.style.getPropertyValue('--offset-y').slice(0, -2) ??
        0,
    );
  };

  const setOffset = (value: number): void => {
    if (!contentRef.current) return;

    contentRef.current.style.setProperty('--offset-y', `${value.toString()}px`);

    overlayRef.current?.style.setProperty(
      'opacity',
      `${1 - Math.max(0, value / contentRef.current.clientHeight)}`,
    );
  };

  const onPress: React.PointerEventHandler = (event) => {
    if (!contentRef.current) return;

    isDraggingRef.current = true;

    setTransition(false);

    window.addEventListener(
      'touchend',
      () => {
        onRelease();
      },
      {
        once: true,
      },
    );

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onRelease = (): void => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (getOffset() > 100) {
      setIsOpen(false);
    } else {
      onReset();
    }
  };

  const onDrag: React.PointerEventHandler = (e) => {
    if (
      !isDraggingRef.current ||
      !shouldDrag(e.target as HTMLElement, e.movementY < 0)
    )
      return;

    setOffset(Math.max(-50, getOffset() + e.movementY));
  };

  const setTransition = (enabled: boolean): void => {
    contentRef.current?.style.setProperty(
      'transition',
      enabled ? `transform 0.5s ${TIMING_FUNCTION}` : 'none',
    );

    overlayRef.current?.style.setProperty(
      'transition',
      enabled ? `opacity 0.5s ${TIMING_FUNCTION}` : 'none',
    );
  };

  const onReset = (): void => {
    if (!contentRef.current) return;
    setTransition(true);
    setOffset(0);
  };

  const shouldDrag = (
    element: HTMLElement,
    isDraggingDown: boolean,
  ): boolean => {
    if (!contentRef.current) return false;
    const highlightedText = window.getSelection()?.toString();
    const swipeAmount = getOffset();

    if (swipeAmount > 0) {
      return true;
    }

    // Don't drag if there's highlighted text
    if (highlightedText && highlightedText.length > 0) {
      return false;
    }

    if (isDraggingDown) return false;

    // Keep climbing up the DOM tree as long as there's a parent
    let currentNode: HTMLElement | null = element;

    while (currentNode) {
      // Check if the element is scrollable
      if (currentNode.scrollHeight > currentNode.clientHeight) {
        if (currentNode.scrollTop > 0)
          // The element is scrollable and not scrolled to the top, so don't drag
          return false;
      }

      if (currentNode.getAttribute('role') === 'dialog') {
        break;
      }

      // Move up to the parent element
      currentNode = currentNode.parentNode as HTMLElement | null;
    }

    // No scrollable parents not scrolled to the top found, so drag
    return true;
  };

  return (
    <DrawerPortal>
      <style>
        {`
        [docs-ui-drawer]::after {
          content: '';
          position: absolute;
          top: 100%;
          background: inherit;
          background-color: inherit;
          left: 0;
          right: 0;
          height: 200%;
        }`}
      </style>
      <DrawerOverlay
        ref={overlayRef}
        onMouseUp={onRelease}
        className="data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
      />
      <DialogPrimitive.Content
        docs-ui-drawer=""
        ref={mergedRefs}
        style={{
          transform: `translateY(var(--offset-y))`,
        }}
        onPointerDown={onPress}
        onPointerUp={onRelease}
        onPointerMove={onDrag}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto mt-24 flex h-[80%] max-h-[500px] max-w-lg flex-col rounded-t-lg border bg-popover shadow-lg data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DrawerPortal>
  );
});

DrawerContent.displayName = 'DrawerContent';

function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
      {...props}
    />
  );
}
DrawerHeader.displayName = 'DrawerHeader';

function DrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('mt-auto flex flex-col p-3', className)} {...props} />
  );
}

DrawerFooter.displayName = 'DrawerFooter';

function mergeRefs<T>(
  ...refs: (React.MutableRefObject<T> | React.LegacyRef<T>)[]
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref !== null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
};
