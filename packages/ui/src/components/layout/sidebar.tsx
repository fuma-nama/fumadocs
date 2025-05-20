'use client';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { usePathname } from 'fumadocs-core/framework';
import {
  type ComponentProps,
  createContext,
  type FC,
  Fragment,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { isActive } from '@/utils/is-active';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type ScrollAreaProps } from '@radix-ui/react-scroll-area';
import { useSidebar } from '@/contexts/sidebar';
import { cva } from 'class-variance-authority';
import type {
  CollapsibleContentProps,
  CollapsibleTriggerProps,
} from '@radix-ui/react-collapsible';
import type { PageTree } from 'fumadocs-core/server';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import { useMediaQuery } from 'fumadocs-core/utils/use-media-query';
import { RemoveScroll } from 'react-remove-scroll';
import { Presence } from '@radix-ui/react-presence';

export interface SidebarProps extends ComponentProps<'aside'> {
  /**
   * Open folders by default if their level is lower or equal to a specific level
   * (Starting from 1)
   *
   * @defaultValue 0
   */
  defaultOpenLevel?: number;

  /**
   * Prefetch links
   *
   * @defaultValue true
   */
  prefetch?: boolean;

  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

interface InternalContext {
  defaultOpenLevel: number;
  prefetch: boolean;
  level: number;
}

const itemVariants = cva(
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground [overflow-wrap:anywhere] md:py-1.5 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 text-fd-primary',
        false:
          'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
      },
    },
  },
);

const Context = createContext<InternalContext | null>(null);
const FolderContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

export function Sidebar({
  defaultOpenLevel = 0,
  prefetch = true,
  collapsible = true,
  ...props
}: SidebarProps) {
  const { open, setOpen, collapsed } = useSidebar();
  const context = useMemo<InternalContext>(() => {
    return {
      defaultOpenLevel,
      prefetch,
      level: 1,
    };
  }, [defaultOpenLevel, prefetch]);

  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);
  const closeTimeRef = useRef(0);
  // md
  const isMobile = useMediaQuery('(width < 768px)') ?? false;

  useOnChange(collapsed, () => {
    setHover(false);
    closeTimeRef.current = Date.now() + 150;
  });

  if (isMobile) {
    const state = open ? 'open' : 'closed';

    return (
      <Context.Provider value={context}>
        <Presence present={open}>
          <div
            data-state={state}
            className="fixed z-40 inset-0 bg-black/30 backdrop-blur-sm data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out"
            onClick={() => setOpen(false)}
          />
        </Presence>
        <Presence present={open}>
          {({ present }) => (
            <RemoveScroll
              as="aside"
              enabled={present}
              id="nd-sidebar-mobile"
              {...props}
              data-state={state}
              className={cn(
                'fixed text-[15px] flex flex-col py-2 rounded-e-2xl border-e start-0 inset-y-0 w-[85%] max-w-[380px] z-40 bg-fd-background data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out',
                !present && 'invisible',
                props.className,
              )}
            >
              {props.children}
            </RemoveScroll>
          )}
        </Presence>
      </Context.Provider>
    );
  }

  return (
    <aside
      id="nd-sidebar"
      {...props}
      data-collapsed={collapsed}
      className={cn(
        'sticky shrink-0 flex flex-col items-end top-(--fd-sidebar-top) z-20 bg-fd-card text-sm h-(--fd-sidebar-height) w-(--fd-sidebar-width) *:w-(--fd-sidebar-width) border-e max-md:hidden',
        'transition-[translate,margin,opacity,width] duration-200',
        collapsed && [
          hover
            ? 'z-50'
            : 'opacity-0 -translate-x-(--fd-sidebar-offset) rtl:translate-x-(--fd-sidebar-offset)',
        ],
        props.className,
      )}
      style={
        {
          '--fd-sidebar-offset': 'calc(100% - 16px)',
          '--fd-sidebar-top':
            'calc(var(--fd-banner-height) + var(--fd-nav-height))',
          '--fd-sidebar-height': 'calc(100dvh - var(--fd-sidebar-top))',
          ...props.style,
        } as object
      }
      onPointerEnter={(e) => {
        if (
          !collapsible ||
          !collapsed ||
          e.pointerType === 'touch' ||
          closeTimeRef.current > Date.now()
        )
          return;
        window.clearTimeout(timerRef.current);
        setHover(true);
      }}
      onPointerLeave={(e) => {
        if (!collapsible || !collapsed || e.pointerType === 'touch') return;
        window.clearTimeout(timerRef.current);

        timerRef.current = window.setTimeout(
          () => {
            setHover(false);
            closeTimeRef.current = Date.now() + 150;
          },
          Math.min(e.clientX, document.body.clientWidth - e.clientX) > 100
            ? 0
            : 500,
        );
      }}
    >
      <Context.Provider value={context}>{props.children}</Context.Provider>
    </aside>
  );
}

export function SidebarHeader(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('flex flex-col gap-3 p-4 pb-2', props.className)}
    >
      {props.children}
    </div>
  );
}

export function SidebarFooter(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('flex flex-col border-t px-4 py-3', props.className)}
    >
      {props.children}
    </div>
  );
}

export function SidebarViewport(props: ScrollAreaProps) {
  return (
    <ScrollArea {...props} className={cn('h-full', props.className)}>
      <ScrollViewport
        className="p-4"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent, white 12px, white calc(100% - 12px), transparent)',
        }}
      >
        {props.children}
      </ScrollViewport>
    </ScrollArea>
  );
}

export function SidebarSeparator(props: ComponentProps<'p'>) {
  const { level } = useInternalContext();

  return (
    <p
      {...props}
      className={cn(
        'inline-flex items-center gap-2 mb-1.5 px-2 font-medium empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0',
        props.className,
      )}
      style={{
        paddingInlineStart: getOffset(level),
        ...props.style,
      }}
    >
      {props.children}
    </p>
  );
}

export function SidebarItem({
  icon,
  ...props
}: LinkProps & {
  icon?: ReactNode;
}) {
  const pathname = usePathname();
  const active =
    props.href !== undefined && isActive(props.href, pathname, false);
  const { prefetch, level } = useInternalContext();

  return (
    <Link
      {...props}
      data-active={active}
      className={cn(itemVariants({ active }), props.className)}
      prefetch={prefetch}
      style={{
        paddingInlineStart: getOffset(level),
        ...props.style,
      }}
    >
      <Border level={level} active={active} />
      {icon ?? (props.external ? <ExternalLink /> : null)}
      {props.children}
    </Link>
  );
}

export function SidebarFolder({
  defaultOpen = false,
  ...props
}: ComponentProps<'div'> & {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useOnChange(defaultOpen, (v) => {
    if (v) setOpen(v);
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} {...props}>
      <FolderContext.Provider
        value={useMemo(() => ({ open, setOpen }), [open])}
      >
        {props.children}
      </FolderContext.Provider>
    </Collapsible>
  );
}

export function SidebarFolderTrigger({
  className,
  ...props
}: CollapsibleTriggerProps) {
  const { level } = useInternalContext();
  const { open } = useFolderContext();

  return (
    <CollapsibleTrigger
      className={cn(itemVariants({ active: false }), 'w-full', className)}
      {...props}
      style={{
        paddingInlineStart: getOffset(level),
        ...props.style,
      }}
    >
      <Border level={level} />
      {props.children}
      <ChevronDown
        data-icon
        className={cn('ms-auto transition-transform', !open && '-rotate-90')}
      />
    </CollapsibleTrigger>
  );
}

export function SidebarFolderLink(props: LinkProps) {
  const { open, setOpen } = useFolderContext();
  const { prefetch, level } = useInternalContext();

  const pathname = usePathname();
  const active =
    props.href !== undefined && isActive(props.href, pathname, false);

  return (
    <Link
      {...props}
      data-active={active}
      className={cn(itemVariants({ active }), 'w-full', props.className)}
      onClick={(e) => {
        if (
          e.target instanceof HTMLElement &&
          e.target.hasAttribute('data-icon')
        ) {
          setOpen(!open);
          e.preventDefault();
        } else {
          setOpen(active ? !open : true);
        }
      }}
      prefetch={prefetch}
      style={{
        paddingInlineStart: getOffset(level),
        ...props.style,
      }}
    >
      <Border level={level} active={active} />
      {props.children}
      <ChevronDown
        data-icon
        className={cn('ms-auto transition-transform', !open && '-rotate-90')}
      />
    </Link>
  );
}

export function SidebarFolderContent(props: CollapsibleContentProps) {
  const ctx = useInternalContext();

  return (
    <CollapsibleContent {...props} className={cn('relative', props.className)}>
      <Context.Provider
        value={useMemo(
          () => ({
            ...ctx,
            level: ctx.level + 1,
          }),
          [ctx],
        )}
      >
        {ctx.level === 1 && (
          <div className="absolute w-px inset-y-1 bg-fd-border start-2.5" />
        )}
        {props.children}
      </Context.Provider>
    </CollapsibleContent>
  );
}

export function SidebarCollapseTrigger(props: ComponentProps<'button'>) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      data-collapsed={collapsed}
      {...props}
      onClick={() => {
        setCollapsed((prev) => !prev);
      }}
    >
      {props.children}
    </button>
  );
}

function useFolderContext() {
  const ctx = useContext(FolderContext);

  if (!ctx) throw new Error('Missing sidebar folder');
  return ctx;
}

function useInternalContext() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('<Sidebar /> component required.');

  return ctx;
}

export interface SidebarComponents {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; level: number; children: ReactNode }>;
  Separator: FC<{ item: PageTree.Separator }>;
}

/**
 * Render sidebar items from page tree
 */
export function SidebarPageTree(props: {
  components?: Partial<SidebarComponents>;
}) {
  const { root } = useTreeContext();

  return useMemo(() => {
    const { Separator, Item, Folder } = props.components ?? {};

    function renderSidebarList(
      items: PageTree.Node[],
      level: number,
    ): ReactNode[] {
      return items.map((item, i) => {
        if (item.type === 'separator') {
          if (Separator) return <Separator key={i} item={item} />;
          return (
            <SidebarSeparator key={i} className={cn(i !== 0 && 'mt-6')}>
              {item.icon}
              {item.name}
            </SidebarSeparator>
          );
        }

        if (item.type === 'folder') {
          const children = renderSidebarList(item.children, level + 1);

          if (Folder)
            return (
              <Folder key={i} item={item} level={level}>
                {children}
              </Folder>
            );
          return (
            <PageTreeFolder key={i} item={item}>
              {children}
            </PageTreeFolder>
          );
        }

        if (Item) return <Item key={item.url} item={item} />;
        return (
          <SidebarItem
            key={item.url}
            href={item.url}
            external={item.external}
            icon={item.icon}
          >
            {item.name}
          </SidebarItem>
        );
      });
    }

    return (
      <Fragment key={root.$id}>{renderSidebarList(root.children, 1)}</Fragment>
    );
  }, [props.components, root]);
}

function PageTreeFolder({
  item,
  ...props
}: {
  item: PageTree.Folder;
  children: ReactNode;
}) {
  const { defaultOpenLevel, level } = useInternalContext();
  const path = useTreePath();

  return (
    <SidebarFolder
      defaultOpen={
        (item.defaultOpen ?? defaultOpenLevel >= level) || path.includes(item)
      }
    >
      {item.index ? (
        <SidebarFolderLink
          href={item.index.url}
          external={item.index.external}
          {...props}
        >
          {item.icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger {...props}>
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent>{props.children}</SidebarFolderContent>
    </SidebarFolder>
  );
}

function getOffset(level: number) {
  return `calc(var(--spacing) * ${level > 1 ? level * 2.5 : 2})`;
}

function Border({ level, active }: { level: number; active?: boolean }) {
  if (level <= 1) return null;

  return (
    <div
      className={cn(
        'absolute w-px inset-y-3 z-[2] start-2.5 md:inset-y-2',
        active && 'bg-fd-primary',
      )}
    />
  );
}
