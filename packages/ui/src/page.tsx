import { type PageTree, type TableOfContents } from 'fumadocs-core/server';
import {
  type AnchorHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { LoaderConfig, LoaderOutput, Page } from 'fumadocs-core/source';
import { type AnchorProviderProps, AnchorProvider } from 'fumadocs-core/toc';
import { Card, Cards } from '@/components/card';
import { replaceOrDefault } from '@/layouts/shared';
import { cn } from './utils/cn';
import {
  Footer,
  type FooterProps,
  LastUpdate,
  PageHeader,
  Breadcrumb,
  type BreadcrumbProps,
} from './page.client';
import {
  Toc,
  TOCItems,
  TocPopoverTrigger,
  TocPopover,
  TocPopoverContent,
  type TOCProps,
} from '@/components/layout/toc';
import { buttonVariants } from '@/components/ui/button';
import { Edit, Text } from 'lucide-react';
import { I18nLabel } from '@/contexts/i18n';
import ClerkTOCItems from '@/components/layout/toc-clerk';

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

interface EditOnGitHubOptions
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  owner: string;
  repo: string;

  /**
   * SHA or ref (branch or tag) name.
   *
   * @defaultValue main
   */
  sha?: string;

  /**
   * File path in the repo
   */
  path: string;
}

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled: boolean;
  component: ReactNode;

  /**
   * Show the full path to the current page
   *
   * @defaultValue false
   * @deprecated use `includePage` instead
   */
  full?: boolean;
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

  container?: HTMLAttributes<HTMLDivElement>;
  article?: HTMLAttributes<HTMLElement>;
  children: ReactNode;
}

export function DocsPage({
  toc = [],
  full = false,
  tableOfContentPopover: {
    enabled: tocPopoverEnabled = true,
    component: tocPopoverReplace,
    ...tocPopoverOptions
  } = {},
  tableOfContent: {
    // disable TOC on full mode, you can still enable it with `enabled` option.
    enabled: tocEnabled,
    component: tocReplace,
    ...tocOptions
  } = {},
  ...props
}: DocsPageProps): ReactNode {
  tocEnabled ??=
    !full &&
    (toc.length > 0 ||
      tocOptions.footer !== undefined ||
      tocOptions.header !== undefined);
  const fullWidth = full && !tocEnabled;

  return (
    <AnchorProvider toc={toc} single={tocOptions.single}>
      <div
        id="nd-page"
        {...props.container}
        className={cn(
          'flex w-full min-w-0 max-w-[var(--fd-page-width)] flex-col md:transition-[max-width]',
          props.container?.className,
        )}
        style={
          {
            '--fd-toc-width': fullWidth ? '0px' : undefined,
          } as object
        }
      >
        {replaceOrDefault(
          { enabled: tocPopoverEnabled, component: tocPopoverReplace },
          <PageHeader id="nd-tocnav">
            <TocPopover>
              <TocPopoverTrigger className="size-full" items={toc} />
              <TocPopoverContent>
                {tocPopoverOptions.header}
                {tocPopoverOptions.style === 'clerk' ? (
                  <ClerkTOCItems items={toc} isMenu />
                ) : (
                  <TOCItems items={toc} isMenu />
                )}
                {tocPopoverOptions.footer}
              </TocPopoverContent>
            </TocPopover>
          </PageHeader>,
          {
            items: toc,
            ...tocPopoverOptions,
          },
        )}
        <article
          {...props.article}
          className={cn(
            'mx-auto flex w-full flex-1 flex-col gap-6 px-4 pt-8 md:pt-12 lg:px-8',
            fullWidth ? 'max-w-[1120px]' : 'max-w-[860px]',
            props.article?.className,
          )}
        >
          {replaceOrDefault(
            props.breadcrumb,
            <Breadcrumb
              includePage={props.breadcrumb?.full}
              {...props.breadcrumb}
            />,
          )}
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
          {replaceOrDefault(
            props.footer,
            <Footer items={props.footer?.items} />,
          )}
        </article>
      </div>
      {replaceOrDefault(
        { enabled: tocEnabled, component: tocReplace },
        <Toc id="nd-toc">
          <div className="flex h-full w-[var(--fd-toc-width)] max-w-full flex-col gap-3 pe-2">
            {tocOptions.header}
            <h3 className="-ms-0.5 inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
              <Text className="size-4" />
              <I18nLabel label="toc" />
            </h3>
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

function EditOnGitHub({
  owner,
  repo,
  sha,
  path,
  ...props
}: EditOnGitHubOptions) {
  const href = `https://github.com/${owner}/${repo}/blob/${sha}/${path.startsWith('/') ? path.slice(1) : path}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
      className={cn(
        buttonVariants({
          color: 'secondary',
          className: 'gap-1.5 text-fd-muted-foreground',
        }),
        props.className,
      )}
    >
      <Edit className="size-3.5" />
      <I18nLabel label="editOnGithub" />
    </a>
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
}) {
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
