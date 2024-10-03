import { type PageTree, type TableOfContents } from 'fumadocs-core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { LoaderConfig, LoaderOutput, Page } from 'fumadocs-core/source';
import { type AnchorProviderProps, AnchorProvider } from 'fumadocs-core/toc';
import { Card, Cards } from '@/components/card';
import type { EditOnGitHubOptions } from '@/components/layout/edit-on-github';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';
import type { BreadcrumbProps, FooterProps, TOCProps } from './page.client';

declare const {
  Toc,
  TocPopover,
  Breadcrumb,
  Footer,
  TOCItems,
  LastUpdate,
}: typeof import('./page.client');

const ClerkTOCItems = dynamic(() => import('@/components/layout/toc-clerk'));
const EditOnGitHub = dynamic(
  () => import('@/components/layout/edit-on-github'),
);

type TableOfContentOptions = Omit<TOCProps, 'items' | 'children'> &
  Pick<AnchorProviderProps, 'single'> & {
    enabled: boolean;
    component: ReactNode;

    /**
     * @defaultValue 'normal'
     */
    style?: 'normal' | 'clerk';
  };

type TableOfContentPopoverOptions = Omit<TableOfContentOptions, 'single'>;

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
  tableOfContentPopover?: Partial<TableOfContentPopoverOptions>;

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: Partial<BreadcrumbOptions>;

  /**
   * Footer navigation, you can disable it by passing `false`
   */
  footer?: Partial<FooterOptions>;

  editOnGithub?: EditOnGitHubOptions;
  lastUpdate?: Date | string | number;

  children: ReactNode;
}

export function DocsPage({
  toc = [],
  breadcrumb = {},
  full = false,
  footer = {},
  ...props
}: DocsPageProps): React.ReactElement {
  const tocPopoverOptions = {
    ...props.tableOfContentPopover,
  };
  const tocOptions = {
    // disable TOC on full mode, you can still enable it with `enabled` option.
    enabled: props.tableOfContent?.enabled ?? !full,
    ...props.tableOfContent,
  };

  if (props.editOnGithub) {
    tocOptions.footer = (
      <>
        {tocOptions.footer}
        <EditOnGitHub {...props.editOnGithub} />
      </>
    );

    tocPopoverOptions.footer = (
      <>
        {tocPopoverOptions.footer}
        <EditOnGitHub {...props.editOnGithub} />
      </>
    );
  }

  return (
    <AnchorProvider toc={toc} single={tocOptions.single}>
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
            id="nd-tocnav"
            className={cn(
              'sticky top-fd-toc-top z-10 border-b bg-fd-background/60 text-sm backdrop-blur-md md:top-[calc(4px+var(--fd-banner-height)+var(--fd-nav-height))] md:mx-3 md:rounded-full md:border md:shadow-md',
              tocPopoverOptions.enabled !== true && 'lg:hidden',
            )}
          >
            <TocPopover
              items={toc}
              header={tocPopoverOptions.header}
              footer={tocPopoverOptions.footer}
            >
              {tocPopoverOptions.style === 'clerk' ? (
                <ClerkTOCItems items={toc} isMenu />
              ) : (
                <TOCItems items={toc} isMenu />
              )}
            </TocPopover>
          </div>,
        )}
        <article className="flex flex-1 flex-col gap-6 px-4 pt-10 md:px-6 md:pt-12">
          {replaceOrDefault(breadcrumb, <Breadcrumb {...breadcrumb} />)}
          {props.children}
          <div className="mt-auto" />
          {props.lastUpdate ? (
            <LastUpdate date={new Date(props.lastUpdate)} />
          ) : null}
          {replaceOrDefault(footer, <Footer items={footer.items} />)}
        </article>
      </div>
      {replaceOrDefault(
        tocOptions,
        <Toc header={tocOptions.header} footer={tocOptions.footer}>
          {tocOptions.style === 'clerk' ? (
            <ClerkTOCItems items={toc} />
          ) : (
            <TOCItems items={toc} />
          )}
        </Toc>,
      )}
    </AnchorProvider>
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
  // don't render if no description provided
  if (props.children === undefined) return null;

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
      className={cn('text-3xl font-bold', props.className)}
    >
      {props.children}
    </h1>
  );
});

DocsTitle.displayName = 'DocsTitle';

export function DocsCategory({
  page,
  from,
  tree: forcedTree,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  page: Page;
  from: LoaderOutput<LoaderConfig>;
  tree?: PageTree.Root;
}): React.ReactNode {
  const tree =
    forcedTree ??
    (from._i18n
      ? (from as LoaderOutput<LoaderConfig & { i18n: true }>).pageTree[
          page.locale ?? from._i18n.defaultLanguage
        ]
      : from.pageTree);

  function findParent(
    node: PageTree.Root | PageTree.Folder,
  ): PageTree.Root | PageTree.Folder | undefined {
    if ('index' in node && node.index?.$ref?.file === page.file.path) {
      return node;
    }

    for (const child of node.children) {
      if (child.type === 'folder') {
        const parent = findParent(child);
        if (parent) return parent;
      }

      if (child.type === 'page' && child.$ref?.file === page.file.path) {
        return node;
      }
    }
  }

  const parent = findParent(tree);
  if (!parent) return null;

  const items = parent.children.flatMap<Page>((item) => {
    if (item.type !== 'page' || item.url === page.url) return [];

    return from.getNodePage(item) ?? [];
  });

  return (
    <Cards {...props}>
      {items.map((item) => (
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
