'use client';
import * as Base from '@/components/toc';
import { useTranslations } from '@fuma-translate/react';
import { cn } from '@/utils/cn';
import { Text } from 'lucide-react';
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { TOCScrollArea, useTOCItems } from '@/components/toc';
import { TOCItem } from 'fumadocs-core/toc';

export type TOCProviderProps = Base.TOCProviderProps;

const Context = createContext<{
  open: boolean;
  setMobileOpen: (v: boolean) => void;
} | null>(null);

export function TOCProvider(props: TOCProviderProps) {
  return <Base.TOCProvider {...props} />;
}

export interface TOCProps {
  container?: ComponentProps<'div'>;
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;
}

function useContext() {
  return use(Context)!;
}

export function TOC({ container, header, footer }: TOCProps) {
  const t = useTranslations({ note: 'table of contents' });
  const items = Base.useTOCItems();
  const [hover, setHover] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const exitTimerRef = useRef<number>(null);
  const open = hover || mobileOpen;

  const ctx = useMemo(
    () => ({
      open,
      setMobileOpen,
    }),
    [open],
  );

  if (items.length === 0 && !footer && !header) {
    return;
  }

  return (
    <Context value={ctx}>
      <div
        className={cn(
          'fixed inset-0 z-10 backdrop-blur-sm transition-opacity duration-300 [mask-image:radial-gradient(circle_at_center_right,white,white_200px,transparent_500px)] xl:hidden',
          !open && 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileOpen(false)}
      />
      <TOCScrollArea
        id="nd-toc"
        {...container}
        className={cn(
          'z-10 flex flex-col transition-[width,padding] duration-300 [grid-area:right] layout:[--fd-right-width:0px] max-xl:fixed max-xl:top-1/2 max-xl:-translate-y-1/2 max-xl:end-1 max-xl:bg-fd-popover max-xl:text-fd-popover-foreground max-xl:border max-xl:rounded-xl max-xl:shadow-lg max-xl:mask-none xl:sticky xl:top-10 xl:h-[calc(100dvh---spacing(10))] xl:layout:[--fd-right-width:240px]',
          open
            ? 'max-xl:w-[240px] max-xl:p-3'
            : 'max-md:w-4 max-md:ps-[calc(--spacing(1.5)-1px)] max-xl:w-6 max-xl:ps-[calc(--spacing(2.5)-1px)]',
          container?.className,
        )}
        onPointerDown={(e) => {
          if (!mobileOpen && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
            setMobileOpen(true);
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') {
            if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
            setHover(true);
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
            exitTimerRef.current = window.setTimeout(
              () => {
                setHover(false);
              },
              // If the pointer leaves the window, use a longer timeout
              window.innerWidth - e.clientX < 30 ? 700 : 50,
            );
          }
        }}
      >
        <div className="flex flex-col my-auto max-xl:min-w-[calc(240px---spacing(6))] xl:items-end xl:text-end xl:pe-4">
          {header}
          <h3
            id="nd-toc-title"
            className={cn(
              'inline-flex items-center gap-1.5 overflow-hidden text-xs text-fd-muted-foreground transition-[opacity,height] opacity-0 h-0',
              open
                ? 'opacity-100 h-6'
                : 'xl:[@media(hover:none)]:opacity-100 xl:[@media(hover:none)]:h-6',
            )}
          >
            <Text className="size-3.5 shrink-0" />
            {t('On this page')}
          </h3>
          <TOCPanel />
          {footer}
        </div>
      </TOCScrollArea>
    </Context>
  );
}

function TOCPanel({ className, ...props }: ComponentProps<'div'>) {
  const items = useTOCItems();
  const { open, setMobileOpen } = useContext();
  const [delayedOpen, setDelayedOpen] = useState(open);

  // ensure it is after open animation
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDelayedOpen(open);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {items.map((item) => (
        <TOCItem
          key={item.url}
          href={item.url}
          className={cn(
            'group h-6 prose prose-sm inline-flex items-center gap-2 text-xs text-fd-muted-foreground transition-[color,height] data-[active=true]:text-fd-primary data-[active=false]:hover:text-fd-accent-foreground xl:flex-row-reverse',
            !open && 'h-3 xl:[@media(hover:none)]:h-6',
          )}
          onClick={() => open && delayedOpen && setMobileOpen(false)}
          autoScroll={open && delayedOpen}
        >
          <div
            className={cn(
              'shrink-0 bg-fd-muted-foreground/50 rounded-full size-1 transition-[background-color,width,height] group-data-[active=true]:bg-fd-primary',
              open
                ? 'w-(--width) h-px'
                : 'xl:[@media(hover:none)]:w-(--width) xl:[@media(hover:none)]:h-px',
            )}
            style={
              {
                '--width': `calc(pow(${item.depth}, 1.5) * var(--spacing))`,
              } as object
            }
          />
          <span
            className={cn(
              'truncate transition-opacity opacity-0',
              open ? 'opacity-100' : 'xl:[@media(hover:none)]:opacity-100',
            )}
          >
            {item.title}
          </span>
        </TOCItem>
      ))}
    </div>
  );
}
