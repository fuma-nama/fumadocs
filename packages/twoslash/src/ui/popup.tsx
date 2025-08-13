import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from '@radix-ui/react-popover';
import { cn } from '@/ui/cn';

interface PopupContextObject {
  open: boolean;
  setOpen: (open: boolean) => void;

  handleOpen: (e: React.PointerEvent) => void;
  handleClose: (e: React.PointerEvent) => void;
}

const PopupContext = createContext<PopupContextObject | undefined>(undefined);

function Popup({
  delay = 300,
  children,
}: {
  delay?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<number>(undefined);
  const closeTimeoutRef = useRef<number>(undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopupContext.Provider
        value={useMemo(
          () => ({
            open,
            setOpen,
            handleOpen(e) {
              if (e.pointerType === 'touch') return;
              if (closeTimeoutRef.current)
                clearTimeout(closeTimeoutRef.current);

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
    </Popover>
  );
}

const PopupTrigger = forwardRef<
  ComponentRef<typeof PopoverTrigger>,
  ComponentPropsWithoutRef<typeof PopoverTrigger>
>(({ children, ...props }, ref) => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverTrigger
      ref={ref}
      onPointerEnter={ctx.handleOpen}
      onPointerLeave={ctx.handleClose}
      asChild
      {...props}
    >
      <span className="twoslash-hover">{children}</span>
    </PopoverTrigger>
  );
});

PopupTrigger.displayName = 'PopupTrigger';

const PopupContent = forwardRef<
  ComponentRef<typeof PopoverContent>,
  ComponentPropsWithoutRef<typeof PopoverContent>
>(
  (
    { className, side = 'bottom', align = 'center', sideOffset = 4, ...props },
    ref,
  ) => {
    const ctx = useContext(PopupContext);
    if (!ctx) throw new Error('Missing Popup Context');

    return (
      <PopoverPortal>
        <PopoverContent
          ref={ref}
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn('fd-twoslash-popover', className)}
          onPointerEnter={ctx.handleOpen}
          onPointerLeave={ctx.handleClose}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
          {...props}
        />
      </PopoverPortal>
    );
  },
);

PopupContent.displayName = 'PopupContent';

export { Popup, PopupTrigger, PopupContent };
