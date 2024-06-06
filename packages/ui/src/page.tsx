import { type TableOfContents, type TOCItemType } from 'fumadocs-core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';
import type { FooterProps } from './page.client';

declare const {
  TOCItems,
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
      <article className="mx-auto flex w-0 max-w-[800px] flex-1 flex-col gap-6 px-4 py-10 md:px-6 md:pt-16">
        {replaceOrDefault(breadcrumb, <Breadcrumb />)}
        {props.children}
        {props.lastUpdate ? (
          <LastUpdate date={new Date(props.lastUpdate)} />
        ) : null}
        {replaceOrDefault(footer, <Footer items={footer.items} />)}
      </article>
      {replaceOrDefault(
        tableOfContent,
        <Toc
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

function Toc(props: TOCProps): React.ReactElement {
  return (
    <div className="sticky top-0 flex h-dvh w-[220px] flex-col gap-4 divide-y py-10 max-lg:hidden xl:w-[260px]">
      {props.header}
      {props.items.length > 0 && <TOCItems items={props.items} />}
      {props.footer ? (
        <div className="pt-4 first:pt-0">{props.footer}</div>
      ) : null}
    </div>
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
