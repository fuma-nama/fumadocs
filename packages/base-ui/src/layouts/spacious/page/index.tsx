'use client';
import { type ComponentProps, createContext, type FC, use, useSyncExternalStore } from 'react';
import { usePathname } from 'fumadocs-core/framework';
import type { TOCItemType } from 'fumadocs-core/toc';
import { useTranslations } from '@fuma-translate/react';
import { EditIcon, SidebarIcon } from 'lucide-react';
import { SidebarCollapseTrigger, useSidebar } from '@/components/sidebar/base';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import {
  TOC,
  TOCDropdown,
  TOCPopover,
  TOCProvider,
  type TOCDropdownProps,
  type TOCPopoverProps,
  type TOCProps,
  type TOCProviderProps,
} from './slots/toc';
import { Footer, type FooterProps } from './slots/footer';
import { Breadcrumb, type BreadcrumbProps, useBreadcrumbItems } from './slots/breadcrumb';
import { useSpaciousLayout } from '..';

interface DocsPageSlots {
  toc: {
    provider: FC<TOCProviderProps>;
    main: FC<TOCProps>;
    popover: FC<TOCPopoverProps>;
    dropdown: FC<TOCDropdownProps>;
  };
  footer: FC<FooterProps>;
  breadcrumb: FC<BreadcrumbProps>;
}

export interface DocsPageProps extends ComponentProps<'article'> {
  toc?: TOCItemType[];
  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;
  slots?: Partial<DocsPageSlots>;
  footer?: FooterProps & { enabled?: boolean };
  breadcrumb?: BreadcrumbProps & { enabled?: boolean };
  tableOfContent?: TOCProps & Pick<TOCProviderProps, 'single'> & { enabled?: boolean };
  tableOfContentPopover?: TOCPopoverProps & { enabled?: boolean };
}

const PageContext = createContext<{
  full: boolean;
  slots: DocsPageSlots;
} | null>(null);

export function useDocsPage() {
  const context = use(PageContext);
  if (!context)
    throw new Error(
      'Please use page components under <DocsPage /> (`fumadocs-ui/layouts/spacious/page`).',
    );
  return context;
}

export function DocsPage({
  full = false,
  toc = [],
  tableOfContent: { enabled: tocEnabled = !full, single, ...tocProps } = {},
  tableOfContentPopover: { enabled: tocPopoverEnabled, ...tocPopoverProps } = {},
  breadcrumb: { enabled: breadcrumbEnabled = true, ...breadcrumb } = {},
  footer: { enabled: footerEnabled = true, ...footer } = {},
  slots: customSlots = {},
  className,
  children,
  ...props
}: DocsPageProps) {
  tocPopoverEnabled ??= Boolean(toc.length > 0 || tocPopoverProps.header || tocPopoverProps.footer);
  const slots: DocsPageSlots = {
    breadcrumb: customSlots.breadcrumb ?? Breadcrumb,
    footer: customSlots.footer ?? Footer,
    toc: customSlots.toc ?? {
      provider: TOCProvider,
      main: TOC,
      popover: TOCPopover,
      dropdown: TOCDropdown,
    },
  };
  const layout = useSpaciousLayout();
  const { aiChat } = layout.props;
  const hasFolders = useBreadcrumbItems(breadcrumb).length > 0 && breadcrumbEnabled;
  const pathname = usePathname();

  return (
    <PageContext value={{ full, slots }}>
      <slots.toc.provider single={single} toc={tocEnabled || tocPopoverEnabled ? toc : []}>
        {tocPopoverEnabled && <slots.toc.popover {...tocPopoverProps} />}
        <div
          // a new page starts from the top of panel
          key={pathname}
          id="nd-page-panel"
          className="@container relative flex flex-col min-w-0 min-h-0 [grid-area:main] mx-2 bg-fd-background md:ms-0 md:my-2 md:overflow-clip md:rounded-2xl md:border md:shadow-sm print:overflow-visible"
        >
          <header
            className={cn(
              'absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 h-(--fd-header-height) ps-6 pe-4 bg-linear-to-b from-fd-background to-transparent pointer-events-none *:pointer-events-auto max-md:hidden',
              // shorter fade for an empty header start
              hasFolders || tocPopoverEnabled ? 'from-50%' : 'to-40%',
            )}
          >
            <ExpandSidebar />
            {breadcrumbEnabled && <slots.breadcrumb {...breadcrumb} />}
            {tocPopoverEnabled && (
              <div
                className={cn(
                  'flex items-center gap-1.5 min-w-0 transition-[opacity,visibility] duration-300 motion-reduce:transition-none',
                  // in place of the hidden TOC
                  tocEnabled &&
                    !(aiChat?.open && aiChat.panel) &&
                    'invisible opacity-0 @max-5xl:visible @max-5xl:opacity-100 @max-5xl:transition-none',
                )}
              >
                {hasFolders && <span className="text-sm text-fd-muted-foreground/50">/</span>}
                <slots.toc.dropdown {...tocPopoverProps} />
              </div>
            )}
            <layout.slots.actions className="ms-auto" />
          </header>
          <div className="flex flex-1 items-start px-4 md:min-h-0 md:pt-(--fd-header-height) md:px-[max(--spacing(6),calc((100%-var(--fd-page-width)-var(--fd-toc-width))/2))] md:overflow-y-auto md:overscroll-y-contain md:scrollbar-thin md:scrollbar-gutter-stable md:scroll-pt-(--fd-header-height) md:[&_[id]]:scroll-mt-2">
            <article
              id="nd-page"
              data-full={full}
              className={cn(
                'flex flex-col gap-4 w-full min-w-0 max-w-(--fd-page-width) pt-6 pb-8 md:pb-16',
                full && 'layout:[--fd-page-width:1200px]',
                className,
              )}
              {...props}
            >
              {breadcrumbEnabled && (
                <slots.breadcrumb
                  {...breadcrumb}
                  className={cn('md:hidden', breadcrumb.className)}
                />
              )}
              {children}
              {footerEnabled && <slots.footer {...footer} />}
            </article>
            {tocEnabled && <slots.toc.main {...tocProps} />}
          </div>
        </div>
        <div className="fixed inset-x-2 bottom-0 top-(--fd-docs-row-3) supports-[top:anchor(--a_bottom)]:top-[anchor(--fd-top-bar_bottom)] z-20 rounded-t-2xl border-x border-t outline-8 outline-fd-card bg-origin-border bg-[linear-gradient(var(--color-fd-background),transparent_16px)] pointer-events-none md:hidden" />
      </slots.toc.provider>
    </PageContext>
  );
}

function ExpandSidebar() {
  const { collapsed } = useSidebar();
  if (!collapsed) return;

  return (
    <SidebarCollapseTrigger
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
        '-ms-2 size-8 text-fd-muted-foreground',
      )}
    >
      <SidebarIcon />
    </SidebarCollapseTrigger>
  );
}

export function EditOnGitHub(props: ComponentProps<'a'>) {
  const t = useTranslations({ note: 'edit page' });

  return (
    <a
      target="_blank"
      rel="noreferrer noopener"
      {...props}
      className={cn(
        buttonVariants({ variant: 'secondary', size: 'sm' }),
        'gap-1.5 not-prose',
        props.className,
      )}
    >
      {props.children ?? (
        <>
          <EditIcon className="size-3.5" />
          {t('Edit on GitHub')}
        </>
      )}
    </a>
  );
}

/**
 * Add typography styles
 */
export function DocsBody({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('prose flex-1', className)} />;
}

export function DocsDescription({ children, className, ...props }: ComponentProps<'p'>) {
  if (children === undefined) return null;

  return (
    <p {...props} className={cn('mb-8 text-lg text-fd-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function DocsTitle({ className, ...props }: ComponentProps<'h1'>) {
  return <h1 {...props} className={cn('text-[1.75em] font-semibold', className)} />;
}

const subscribe = () => () => {};

export function PageLastUpdate({
  date: value,
  ...props
}: Omit<ComponentProps<'p'>, 'children'> & { date: Date }) {
  const t = useTranslations({ note: 'page footer' });
  // in the client timezone
  const date = useSyncExternalStore(
    subscribe,
    () => value.toLocaleDateString(),
    () => '',
  );

  return (
    <p {...props} className={cn('text-sm text-fd-muted-foreground', props.className)}>
      {t('Last updated on')} {date}
    </p>
  );
}

export { type BreadcrumbProps, Breadcrumb as PageBreadcrumb } from './slots/breadcrumb';
export { type FooterProps, Footer as PageFooter } from './slots/footer';
export { MarkdownCopyButton, ViewOptionsPopover } from '@/layouts/shared/page-actions';
