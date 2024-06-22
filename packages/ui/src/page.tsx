import { type TableOfContents } from 'fumadocs-core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';
import type { BreadcrumbProps, FooterProps, TOCProps } from './page.client';

declare const {
  Toc,
  TocPopover,
  Breadcrumb,
  Footer,
  TocProvider,
  LastUpdate,
}: typeof import('./page.client');

type TableOfContentOptions = Omit<TOCProps, 'items'> & {
  enabled: boolean;
  component: ReactNode;
};

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled: boolean;
  component: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled: boolean;
  component: ReactNode;
}

export interface DocsPageProps {
  toc?: TableOfContents;

  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;

  tableOfContent?: Partial<TableOfContentOptions>;

  tableOfContentPopover?: Partial<TableOfContentOptions>;

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: Partial<BreadcrumbOptions>;

  /**
   * Footer navigation, you can disable it by passing `false`
   */
  footer?: Partial<FooterOptions>;

  lastUpdate?: Date | string | number;

  children: ReactNode;
}

export function DocsPage({
  toc = [],
  tableOfContent = {},
  breadcrumb = {},
  tableOfContentPopover = {},
  lastUpdate,
  full = false,
  footer = {},
  ...props
}: DocsPageProps): React.ReactElement {
  const tocOptions = {
    // disable TOC on full mode, you can still enable it with `enabled` option.
    enabled: tableOfContent.enabled ?? !full,
    ...tableOfContent,
  };

  return (
    <TocProvider toc={toc}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            'sticky top-16 z-10 border-b bg-background/60 text-sm font-medium backdrop-blur-md md:top-0 md:bg-card',
            !full && 'lg:hidden',
          )}
        >
          {replaceOrDefault(
            tableOfContentPopover,
            <TocPopover
              items={toc}
              header={tableOfContentPopover.header}
              footer={tableOfContentPopover.footer}
              className="inline-flex items-center gap-2 px-4 py-2 text-left max-md:size-full md:ps-6 md:text-muted-foreground"
            />,
          )}
        </div>
        <article
          className={cn(
            'mx-auto flex w-full max-w-[840px] flex-1 flex-col gap-6 px-4 pt-10 md:px-6 md:pt-12',
            !tocOptions.enabled && 'max-w-[1200px]',
          )}
        >
          {replaceOrDefault(breadcrumb, <Breadcrumb full={breadcrumb.full} />)}
          {props.children}
          <div className="mt-auto" />
          {lastUpdate ? <LastUpdate date={new Date(lastUpdate)} /> : null}
          {replaceOrDefault(footer, <Footer items={footer.items} />)}
        </article>
      </div>
      {replaceOrDefault(
        tocOptions,
        <Toc
          items={toc}
          header={tocOptions.header}
          footer={tocOptions.footer}
        />,
      )}
    </TocProvider>
  );
}

/**
 * Add typography styles
 */
export const DocsBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('prose', className)} {...props} />
));

DocsBody.displayName = 'DocsBody';

/**
 * For separate MDX page
 */
export function withArticle({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <main className="container py-12">
      <article className="prose">{children}</article>
    </main>
  );
}
