import {
  forwardRef,
  useState,
  useRef,
  useContext,
  createContext,
  useMemo,
} from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

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
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<number>(undefined);
  const closeTimeoutRef = useRef<number>(undefined);

  const handleOpen = (e: React.PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    openTimeoutRef.current = window.setTimeout(() => {
      setOpen(true);
    }, delay);
  };

  const handleClose = (e: React.PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);

    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, delay);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopupContext.Provider
        value={useMemo(
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

const PopupTrigger = forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>((props, ref) => {
  const ctx = useContext(PopupContext);
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

const PopupContent = forwardRef<
  React.ComponentRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>((props, ref) => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <PopoverContent
      ref={ref}
      onPointerEnter={ctx.handleOpen}
      onPointerLeave={ctx.handleClose}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
      }}
      {...props}
    />
  );
});

PopupContent.displayName = 'PopupContent';

export { Popup, PopupTrigger, PopupContent };
