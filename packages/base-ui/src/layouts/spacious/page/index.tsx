'use client';
import { type ComponentProps, createContext, type FC, use, useEffect, useState } from 'react';
import { usePathname } from 'fumadocs-core/framework';
import type { TOCItemType } from 'fumadocs-core/toc';
import { useTranslations } from '@fuma-translate/react';
import { EditIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import {
  TOC,
  TOCPopover,
  TOCProvider,
  type TOCPopoverProps,
  type TOCProps,
  type TOCProviderProps,
} from './slots/toc';
import { Footer, type FooterProps } from './slots/footer';
import { Breadcrumb, type BreadcrumbProps } from './slots/breadcrumb';

interface DocsPageSlots {
  toc: {
    provider: FC<TOCProviderProps>;
    main: FC<TOCProps>;
    popover: FC<TOCPopoverProps>;
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
  tableOfContentPopover: { enabled: tocPopoverEnabled = true, ...tocPopoverProps } = {},
  breadcrumb: { enabled: breadcrumbEnabled = true, ...breadcrumb } = {},
  footer: { enabled: footerEnabled = true, ...footer } = {},
  slots: customSlots = {},
  className,
  children,
  ...props
}: DocsPageProps) {
  const slots: DocsPageSlots = {
    breadcrumb: customSlots.breadcrumb ?? Breadcrumb,
    footer: customSlots.footer ?? Footer,
    toc: customSlots.toc ?? { provider: TOCProvider, main: TOC, popover: TOCPopover },
  };
  const hasPopover = tocPopoverEnabled && toc.length > 0;
  const pathname = usePathname();

  return (
    <PageContext value={{ full, slots }}>
      <slots.toc.provider single={single} toc={toc}>
        <div
          // a new page starts from the top of panel
          key={pathname}
          id="nd-page-panel"
          className="relative flex flex-col min-w-0 [grid-area:main] md:my-2 md:me-2 md:overflow-y-auto md:overscroll-y-contain md:scrollbar-thin md:scrollbar-gutter-both md:rounded-2xl md:border md:bg-fd-background md:shadow-sm md:[&_[id]]:scroll-mt-20 print:overflow-visible"
        >
          <header className="sticky top-14 z-10 flex shrink-0 items-center h-11 px-4 border-b bg-fd-background/80 backdrop-blur-md empty:hidden md:top-0 md:h-12 md:px-6 md:border-b-0 md:bg-fd-background md:after:absolute md:after:inset-x-0 md:after:top-full md:after:h-6 md:after:bg-linear-to-b md:after:from-fd-background md:after:pointer-events-none">
            {breadcrumbEnabled && (
              <slots.breadcrumb
                {...breadcrumb}
                className={cn(hasPopover && 'max-xl:hidden', breadcrumb.className)}
              />
            )}
            {hasPopover && (
              <slots.toc.popover
                {...tocPopoverProps}
                trigger={{
                  ...tocPopoverProps.trigger,
                  className: cn('xl:hidden', tocPopoverProps.trigger?.className),
                }}
              />
            )}
          </header>
          <div className="flex flex-1 justify-center gap-12 px-4 md:px-8">
            <article
              id="nd-page"
              data-full={full}
              className={cn(
                'flex flex-col gap-4 w-full min-w-0 max-w-[760px] pt-8 pb-12 md:pt-10',
                full && 'max-w-[1200px]',
                className,
              )}
              {...props}
            >
              {children}
              {footerEnabled && <slots.footer {...footer} />}
            </article>
            {tocEnabled && <slots.toc.main {...tocProps} />}
          </div>
        </div>
      </slots.toc.provider>
    </PageContext>
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

export function PageLastUpdate({
  date: value,
  ...props
}: Omit<ComponentProps<'p'>, 'children'> & { date: Date }) {
  const t = useTranslations({ note: 'page footer' });
  const [date, setDate] = useState('');

  useEffect(() => {
    // to the timezone of client
    setDate(value.toLocaleDateString());
  }, [value]);

  return (
    <p {...props} className={cn('text-sm text-fd-muted-foreground', props.className)}>
      {t('Last updated on')} {date}
    </p>
  );
}

export { type BreadcrumbProps, Breadcrumb as PageBreadcrumb } from './slots/breadcrumb';
export { type FooterProps, Footer as PageFooter } from './slots/footer';
export { MarkdownCopyButton, ViewOptionsPopover } from '@/layouts/shared/page-actions';
