import { type PageTree, type TableOfContents } from 'fumadocs-core/server';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { LoaderConfig, LoaderOutput, Page } from 'fumadocs-core/source';
import { type AnchorProviderProps, AnchorProvider } from 'fumadocs-core/toc';
import { Card, Cards } from '@/components/card';
import type { EditOnGitHubOptions } from '@/components/layout/edit-on-github';
import { replaceOrDefault } from '@/layouts/shared';
import { cn } from './utils/cn';
import {
  Footer,
  type FooterProps,
  LastUpdate,
  PageContainer,
} from './page.client';
import {
  Breadcrumb,
  type BreadcrumbProps,
} from '@/components/layout/breadcrumb';
import {
  Toc,
  TOCItems,
  type TOCProps,
  TocTitle,
} from '@/components/layout/toc';
import {
  TocPopoverTrigger,
  TocPopover,
  TocPopoverContent,
} from '@/components/layout/toc-popover';

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
  tableOfContentPopover: {
    enabled: tocPopoverEnabled = true,
    component: tocPopoverReplace,
    ...tocPopoverOptions
  } = {},
  tableOfContent: {
    // disable TOC on full mode, you can still enable it with `enabled` option.
    enabled: tocEnabled = !full,
    component: tocReplace,
    ...tocOptions
  } = {},
  ...props
}: DocsPageProps): ReactNode {
  return (
    <AnchorProvider toc={toc} single={tocOptions.single}>
      <PageContainer
        style={
          {
            '--fd-toc-width': tocEnabled ? undefined : '0px',
          } as object
        }
      >
        {replaceOrDefault(
          { enabled: tocPopoverEnabled, component: tocPopoverReplace },
          <TocPopover {...tocPopoverOptions} className="lg:hidden">
            <TocPopoverTrigger items={toc} />
            <TocPopoverContent>
              {tocPopoverOptions.header}
              {tocPopoverOptions.style === 'clerk' ? (
                <ClerkTOCItems items={toc} isMenu />
              ) : (
                <TOCItems items={toc} isMenu />
              )}
              {tocPopoverOptions.footer}
            </TocPopoverContent>
          </TocPopover>,
          {
            items: toc,
            ...tocPopoverOptions,
          },
        )}
        <article
          className={cn(
            'mx-auto flex w-full flex-1 flex-col gap-6 px-4 pt-10 md:px-6 md:pt-12',
            tocEnabled ? 'max-w-[860px]' : 'max-w-[1120px]',
          )}
        >
          {replaceOrDefault(breadcrumb, <Breadcrumb {...breadcrumb} />)}
          {props.children}
          <div role="none" className="flex-1" />
          <div className="flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden">
            {props.editOnGithub ? (
              <EditOnGitHub {...props.editOnGithub} />
            ) : null}
            {props.lastUpdate ? (
              <LastUpdate date={new Date(props.lastUpdate)} />
            ) : null}
          </div>
          {replaceOrDefault(footer, <Footer items={footer.items} />)}
        </article>
      </PageContainer>
      {replaceOrDefault(
        { enabled: tocEnabled, component: tocReplace },
        <Toc>
          <div className="flex h-full w-[var(--fd-toc-width)] max-w-full flex-col gap-3">
            {tocOptions.header}
            <TocTitle />
            {tocOptions.style === 'clerk' ? (
              <ClerkTOCItems items={toc} />
            ) : (
              <TOCItems items={toc} />
            )}
            {tocOptions.footer}
          </div>
        </Toc>,
        {
          items: toc,
          ...tocOptions,
        },
        <div role="none" className="flex-1" />,
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

function findParent(
  node: PageTree.Root | PageTree.Folder,
  page: Page,
): PageTree.Root | PageTree.Folder | undefined {
  if ('index' in node && node.index?.$ref?.file === page.file.path) {
    return node;
  }

  for (const child of node.children) {
    if (child.type === 'folder') {
      const parent = findParent(child, page);
      if (parent) return parent;
    }

    if (child.type === 'page' && child.$ref?.file === page.file.path) {
      return node;
    }
  }
}

export function DocsCategory({
  page,
  from,
  tree: forcedTree,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  page: Page;
  from: LoaderOutput<LoaderConfig>;
  tree?: PageTree.Root;
}): ReactNode {
  const tree =
    forcedTree ??
    (from._i18n
      ? (from as LoaderOutput<LoaderConfig & { i18n: true }>).pageTree[
          page.locale ?? from._i18n.defaultLanguage
        ]
      : from.pageTree);

  const parent = findParent(tree, page);
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
export function withArticle({ children }: { children: ReactNode }): ReactNode {
  return (
    <main className="container py-12">
      <article className="prose">{children}</article>
    </main>
  );
}
