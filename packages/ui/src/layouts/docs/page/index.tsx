import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { Edit, Text } from 'lucide-react';
import { I18nLabel } from '@/contexts/i18n';
import {
  type BreadcrumbProps,
  type FooterProps,
  PageBreadcrumb,
  PageFooter,
  PageLastUpdate,
  PageTOCPopover,
  PageTOCPopoverContent,
  PageTOCPopoverTrigger,
} from './client';
import type { AnchorProviderProps, TOCItemType } from 'fumadocs-core/toc';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import { TOCProvider, TOCScrollArea } from '@/components/toc';

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled: boolean;
  component: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled: boolean;
  component: ReactNode;
}

interface EditOnGitHubOptions
  extends Omit<ComponentProps<'a'>, 'href' | 'children'> {
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

export interface DocsPageProps {
  toc?: TOCItemType[];
  tableOfContent?: Partial<TableOfContentOptions>;
  tableOfContentPopover?: Partial<TableOfContentPopoverOptions>;

  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;

  editOnGithub?: EditOnGitHubOptions;
  lastUpdate?: Date | string | number;

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: Partial<BreadcrumbOptions>;

  /**
   * Footer navigation, you can disable it by passing `false`
   */
  footer?: Partial<FooterOptions>;

  children?: ReactNode;
}

type TableOfContentOptions = Pick<AnchorProviderProps, 'single'> & {
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  enabled: boolean;
  component: ReactNode;

  /**
   * @defaultValue 'normal'
   */
  style?: 'normal' | 'clerk';
};

type TableOfContentPopoverOptions = Omit<TableOfContentOptions, 'single'>;

export function DocsPage({
  breadcrumb: {
    enabled: breadcrumbEnabled = true,
    component: breadcrumb,
    ...breadcrumbProps
  } = {},
  footer = {},
  full = false,
  tableOfContentPopover: {
    enabled: tocPopoverEnabled,
    component: tocPopover,
    ...tocPopoverOptions
  } = {},
  tableOfContent: {
    enabled: tocEnabled,
    component: tocReplace,
    ...tocOptions
  } = {},
  toc = [],
  editOnGithub,
  lastUpdate,
  children,
}: DocsPageProps) {
  // disable TOC on full mode, you can still enable it with `enabled` option.
  tocEnabled ??=
    !full &&
    (toc.length > 0 ||
      tocOptions.footer !== undefined ||
      tocOptions.header !== undefined);

  tocPopoverEnabled ??=
    toc.length > 0 ||
    tocPopoverOptions.header !== undefined ||
    tocPopoverOptions.footer !== undefined;

  let wrapper = (children: ReactNode) => children;

  if (tocEnabled || tocPopoverEnabled) {
    wrapper = (children) => (
      <TOCProvider single={tocOptions.single} toc={toc}>
        {children}
      </TOCProvider>
    );
  }

  return wrapper(
    <>
      {tocPopoverEnabled &&
        (tocPopover ?? (
          <PageTOCPopover>
            <PageTOCPopoverTrigger />
            <PageTOCPopoverContent>
              {tocPopoverOptions.header}
              <TOCScrollArea>
                {tocPopoverOptions.style === 'clerk' ? (
                  <TocClerk.TOCItems />
                ) : (
                  <TocDefault.TOCItems />
                )}
              </TOCScrollArea>
              {tocPopoverOptions.footer}
            </PageTOCPopoverContent>
          </PageTOCPopover>
        ))}
      <article
        id="nd-page"
        className="flex flex-col min-w-0 [grid-area:main] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14"
      >
        {breadcrumbEnabled &&
          (breadcrumb ?? <PageBreadcrumb {...breadcrumbProps} />)}
        {children}
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden">
          {editOnGithub && (
            <EditOnGitHub
              href={`https://github.com/${editOnGithub.owner}/${editOnGithub.repo}/blob/${editOnGithub.sha}/${editOnGithub.path.startsWith('/') ? editOnGithub.path.slice(1) : editOnGithub.path}`}
            />
          )}
          {lastUpdate && <PageLastUpdate date={new Date(lastUpdate)} />}
        </div>
        {footer.enabled !== false &&
          (footer.component ?? <PageFooter items={footer.items} />)}
      </article>
      {tocEnabled &&
        (tocReplace ?? (
          <div
            id="nd-toc"
            className="sticky top-(--fd-docs-toc-top) h-[calc(100dvh-var(--fd-docs-toc-top))] flex flex-col min-h-0 [grid-area:toc] w-(--fd-toc-width) pt-12 pe-4 pb-2 max-xl:hidden"
          >
            {tocOptions.header}
            <h3
              id="toc-title"
              className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
            >
              <Text className="size-4" />
              <I18nLabel label="toc" />
            </h3>
            <TOCScrollArea>
              {tocOptions.style === 'clerk' ? (
                <TocClerk.TOCItems />
              ) : (
                <TocDefault.TOCItems />
              )}
            </TOCScrollArea>
            {tocOptions.footer}
          </div>
        ))}
    </>,
  );
}

export function EditOnGitHub(props: ComponentProps<'a'>) {
  return (
    <a
      target="_blank"
      rel="noreferrer noopener"
      {...props}
      className={cn(
        buttonVariants({
          color: 'secondary',
          size: 'sm',
          className: 'gap-1.5 not-prose',
        }),
        props.className,
      )}
    >
      {props.children ?? (
        <>
          <Edit className="size-3.5" />
          <I18nLabel label="editOnGithub" />
        </>
      )}
    </a>
  );
}

/**
 * Add typography styles
 */
export function DocsBody({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div {...props} className={cn('prose flex-1', className)}>
      {children}
    </div>
  );
}

export function DocsDescription({
  children,
  className,
  ...props
}: ComponentProps<'p'>) {
  // Don't render if no description provided
  if (children === undefined) return null;

  return (
    <p
      {...props}
      className={cn('mb-8 text-lg text-fd-muted-foreground', className)}
    >
      {children}
    </p>
  );
}

export function DocsTitle({
  children,
  className,
  ...props
}: ComponentProps<'h1'>) {
  return (
    <h1 {...props} className={cn('text-[1.75em] font-semibold', className)}>
      {children}
    </h1>
  );
}

/**
 * For separate MDX page
 */
export function withArticle(props: ComponentProps<'main'>) {
  return (
    <main {...props} className={cn('container py-12', props.className)}>
      <article className="prose">{props.children}</article>
    </main>
  );
}
