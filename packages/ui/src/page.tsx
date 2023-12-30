import { cva } from 'class-variance-authority';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  findNeighbour,
  type PageTree,
  type TableOfContents,
  type TOCItemType,
} from 'next-docs-zeta/server';
import Link from 'next/link';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';

// We can keep the "use client" directives with dynamic imports
// Next.js bundler should handle this automatically
const { TOCItems, Breadcrumb, LastUpdate } = await import('./page.client');

export interface DocsPageProps {
  /**
   * The URL of the current page
   */
  url: string;

  tree: PageTree.Root;

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
  footer?: FooterProps | false;
  lastUpdate?: Date | null;

  children: ReactNode;
}

export function DocsPage({
  tableOfContent = {},
  breadcrumb = {},
  url,
  tree,
  ...props
}: DocsPageProps): JSX.Element {
  const footer = props.footer ?? findNeighbour(tree, url);

  return (
    <>
      <article className="flex w-0 flex-1 flex-col gap-6 py-10">
        {replaceOrDefault(breadcrumb, <Breadcrumb />)}
        {props.children}
        {props.lastUpdate ? <LastUpdate date={props.lastUpdate} /> : null}
        {props.footer !== false && <Footer {...footer} />}
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

interface FooterProps {
  previous?: { name: string; url: string };
  next?: { name: string; url: string };
}

const footerItem = cva(
  'flex flex-row items-center gap-2 text-muted-foreground transition-colors hover:text-foreground',
);

function Footer({ next, previous }: FooterProps): JSX.Element {
  return (
    <div className="mt-4 flex flex-row flex-wrap gap-4 border-t py-12">
      {previous ? (
        <Link href={previous.url} className={footerItem()}>
          <ChevronLeftIcon className="h-5 w-5 shrink-0" />
          <p className="font-medium text-foreground">{previous.name}</p>
        </Link>
      ) : null}
      {next ? (
        <Link href={next.url} className={footerItem({ className: 'ml-auto' })}>
          <p className="text-end font-medium text-foreground">{next.name}</p>
          <ChevronRightIcon className="h-5 w-5 shrink-0" />
        </Link>
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
