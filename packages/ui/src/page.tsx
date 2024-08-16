import { type TableOfContents } from 'fumadocs-core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { Page } from 'fumadocs-core/source';
import { Card, Cards } from '@/components/card';
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
  tableOfContentPopover: tocPopoverOptions = {},
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
      <div
        className={cn(
          'mx-auto flex min-w-0 max-w-[860px] flex-1 flex-col',
          !tocOptions.enabled &&
            // ensure it's still centered when toc is hidden
            'max-w-[1200px] md:ms-[max(0px,calc(50vw-min(50%,600px)-var(--fd-c-sidebar)))]',
        )}
      >
        {replaceOrDefault(
          tocPopoverOptions,
          <div
            className={cn(
              'sticky top-14 z-10 border-b bg-fd-background/60 text-sm backdrop-blur-md md:top-1 md:mx-3 md:rounded-full md:border md:shadow-md',
              tocPopoverOptions.enabled !== true && 'lg:hidden',
            )}
          >
            <TocPopover
              items={toc}
              header={tocPopoverOptions.header}
              footer={tocPopoverOptions.footer}
            />
          </div>,
        )}
        <article className="flex flex-1 flex-col gap-6 px-4 pt-10 md:px-6 md:pt-12">
          {replaceOrDefault(breadcrumb, <Breadcrumb {...breadcrumb} />)}
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

export const DocsDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>((props, ref) => {
  return (
    <p
      ref={ref}
      {...props}
      className={cn('mb-8 text-lg text-fd-muted-foreground', props.className)}
    >
      {props.children}
    </p>
  );
});

DocsDescription.displayName = 'DocsDescription';

export const DocsTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>((props, ref) => {
  return (
    <h1
      ref={ref}
      {...props}
      className={cn('text-3xl font-bold sm:text-4xl', props.className)}
    >
      {props.children}
    </h1>
  );
});

DocsTitle.displayName = 'DocsTitle';

export function DocsCategory({
  page,
  pages,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  page: Page;
  pages: Page[];
}): React.ReactElement {
  const filtered = pages.filter(
    (item) =>
      item.file.dirname === page.file.dirname &&
      item.file.name !== page.file.name,
  );

  return (
    <Cards {...props}>
      {filtered.map((item) => (
        <Card
          key={item.url}
          title={item.data.title}
          description={
            (item.data as { description?: string }).description ??
            'No Description'
          }
          href={item.url}
        />
      ))}
    </Cards>
  );
}

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
