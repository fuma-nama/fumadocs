import {
  ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useRef,
} from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/ui/cn';

interface PopupContextObject {
  triggerId: string;
  handle: PopoverPrimitive.Handle<unknown>;
  handleOpen: (e: React.PointerEvent) => void;
  handleClose: (e: React.PointerEvent) => void;
}

let opening: PopoverPrimitive.Handle<unknown> | undefined;

const PopupContext = createContext<PopupContextObject | undefined>(undefined);

function Popup({
  openDelay = 200,
  closeDelay = 100,
  children,
}: {
  openDelay?: number;
  closeDelay?: number;
  children: ReactNode;
}) {
  const triggerId = useId();
  const handle = useMemo(() => PopoverPrimitive.createHandle(), []);
  const openTimeoutRef = useRef<number>(undefined);
  const closeTimeoutRef = useRef<number>(undefined);

  return (
    <PopoverPrimitive.Root handle={handle}>
      <PopupContext.Provider
        value={useMemo(
          () => ({
            triggerId,
            handle,
            handleOpen(e) {
              if (e.pointerType === 'touch') return;
              if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
              const openPopup = () => {
                opening?.close();
                opening = handle;
                handle.open(triggerId);
              };

              if (opening) {
                openPopup();
                return;
              }

              openTimeoutRef.current = window.setTimeout(openPopup, openDelay);
            },
            handleClose(e) {
              if (e.pointerType === 'touch') return;
              if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);

              closeTimeoutRef.current = window.setTimeout(() => {
                handle.close();
                opening = undefined;
              }, closeDelay);
            },
          }),
          [openDelay, closeDelay, handle],
        )}
      >
        {children}
      </PopupContext.Provider>
    </PopoverPrimitive.Root>
  );
}

function PopupTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverPrimitive.Trigger
      id={ctx.triggerId}
      handle={ctx.handle}
      onPointerEnter={ctx.handleOpen}
      onPointerLeave={ctx.handleClose}
      {...props}
      className={cn('twoslash-hover', props.className)}
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
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="fd-twoslash-popover-positioner"
      >
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
