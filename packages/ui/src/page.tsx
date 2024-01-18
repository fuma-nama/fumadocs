import { type TableOfContents, type TOCItemType } from '@fuma-docs/core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';
import type { FooterProps } from './page.client';

// We can keep the "use client" directives with dynamic imports
// Next.js bundler should handle this automatically
const { TOCItems, Breadcrumb, LastUpdate, Footer } = await import(
  './page.client'
);

export interface DocsPageProps {
  toc?: TableOfContents;

  tableOfContent?: Partial<
    Omit<TOCProps, 'items'> & {
      enabled: boolean;
      component: ReactNode;
    }
  >;

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: Partial<{
    enabled: boolean;
    component: ReactNode;
  }>;

  /**
   * Footer navigation, you can disable it by passing `false`
   */
  footer?: Partial<{
    enabled: boolean;
    component: ReactNode;
    items: NonNullable<FooterProps['items']>;
  }>;

  lastUpdate?: Date | string | number;

  children: ReactNode;
}

export function DocsPage({
  tableOfContent = {},
  breadcrumb = {},
  footer = {},
  ...props
}: DocsPageProps): JSX.Element {
  return (
    <>
      <article className="flex w-0 flex-1 flex-col gap-6 py-10">
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

function Toc(props: TOCProps): JSX.Element {
  return (
    <div className="sticky top-16 flex h-body w-[220px] flex-col gap-4 divide-y py-10 max-lg:hidden xl:w-[260px]">
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
