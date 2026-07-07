import {
  ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/ui/cn';

interface PopupContextObject {
  open: boolean;
  setOpen: (open: boolean) => void;

  handleOpen: (e: React.PointerEvent) => void;
  handleClose: (e: React.PointerEvent) => void;
}

const PopupContext = createContext<PopupContextObject | undefined>(undefined);

function Popup({ delay = 300, children }: { delay?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<number>(undefined);
  const closeTimeoutRef = useRef<number>(undefined);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopupContext.Provider
        value={useMemo(
          () => ({
            open,
            setOpen,
            handleOpen(e) {
              if (e.pointerType === 'touch') return;
              if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

              openTimeoutRef.current = window.setTimeout(() => {
                setOpen(true);
              }, delay);
            },
            handleClose(e) {
              if (e.pointerType === 'touch') return;
              if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);

              closeTimeoutRef.current = window.setTimeout(() => {
                setOpen(false);
              }, delay);
            },
          }),
          [delay, open],
        )}
      >
        {children}
      </PopupContext.Provider>
    </PopoverPrimitive.Root>
  );
}

function PopupTrigger({ children, ...props }: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverPrimitive.Trigger
      onPointerEnter={ctx.handleOpen}
      onPointerLeave={ctx.handleClose}
      render={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          className={cn('twoslash-hover', triggerProps.className)}
        >
          {children}
        </button>
      )}
      {...props}
    />
  );
}

function PopupContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  ref,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<React.ComponentProps<typeof PopoverPrimitive.Positioner>, 'align' | 'side' | 'sideOffset'>) {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} align={align} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          ref={ref}
          className={cn('fd-twoslash-popover', className)}
          onPointerEnter={ctx.handleOpen}
          onPointerLeave={ctx.handleClose}
          initialFocus={false}
          finalFocus={false}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popup, PopupTrigger, PopupContent };
