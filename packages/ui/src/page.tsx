import { type TableOfContents, type TOCItemType } from 'fumadocs-core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';
import type { FooterProps } from './page.client';

declare const {
  TOC,
  SubTOC,
  Breadcrumb,
  Footer,
  LastUpdate,
}: typeof import('./page.client');

type TableOfContentOptions = Omit<TOCProps, 'items'> & {
  enabled: boolean;
  component: ReactNode;
};

interface BreadcrumbOptions {
  enabled: boolean;
  component: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled: boolean;
  component: ReactNode;
}

export interface DocsPageProps {
  toc?: TableOfContents;

  tableOfContent?: Partial<TableOfContentOptions>;

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
  tableOfContent = {},
  breadcrumb = {},
  footer = {},
  ...props
}: DocsPageProps): React.ReactElement {
  return (
    <>
      <article
        className={cn(
          'mx-auto flex w-0 max-w-[800px] flex-1 flex-col gap-6 px-4 py-10 md:px-6 md:pt-12',
          tableOfContent.enabled === false && 'max-w-[1200px]',
        )}
      >
        {replaceOrDefault(breadcrumb, <Breadcrumb />)}
        {props.children}
        {props.lastUpdate ? (
          <LastUpdate date={new Date(props.lastUpdate)} />
        ) : null}
        {replaceOrDefault(footer, <Footer items={footer.items} />)}
        <SubTOC
          items={props.toc ?? []}
          header={tableOfContent.header}
          footer={tableOfContent.footer}
        />
      </article>
      {replaceOrDefault(
        tableOfContent,
        <TOC
          items={props.toc ?? []}
          header={tableOfContent.header}
          footer={tableOfContent.footer}
        />,
      )}
    </>
  );
}

interface TOCProps {
  items: TOCItemType[];

  /**
   * Custom content in TOC container, before the main TOC
   */
  header: ReactNode;
  /**
   * Custom content in TOC container, after the main TOC
   */
  footer: ReactNode;
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
