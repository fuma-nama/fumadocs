import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { Edit } from '@/icons';
import { I18nLabel } from '@/contexts/i18n';
import type { AnchorProviderProps, TOCItemType } from 'fumadocs-core/toc';
import { TOCProvider, TOCScrollArea } from '@/components/toc';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import { Text } from 'lucide-react';
import {
  BreadcrumbProps,
  FooterProps,
  PageBreadcrumb,
  PageFooter,
  PageLastUpdate,
  PageTOC,
  PageTOCPopover,
  PageTOCPopoverContent,
  PageTOCPopoverTrigger,
} from './client';

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

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled: boolean;
  component: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled: boolean;
  component: ReactNode;
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

  container?: ComponentProps<'div'>;
  article?: ComponentProps<'article'>;
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
  editOnGithub,
  breadcrumb: {
    enabled: breadcrumbEnabled = true,
    component: breadcrumb,
    ...breadcrumbProps
  } = {},
  footer = {},
  lastUpdate,
  container,
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
  article,
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
      <TOCProvider toc={toc} single={tocOptions.single}>
        {children}
      </TOCProvider>
    );
  }

  return wrapper(
    <div
      id="nd-page"
      {...container}
      className={cn(
        'flex flex-1 w-full mx-auto max-w-(--fd-page-width) pt-(--fd-tocnav-height) pe-(--fd-toc-width)',
        container?.className,
      )}
    >
      {tocPopoverEnabled &&
        (tocPopover ?? (
          <PageTOCPopover>
            <PageTOCPopoverTrigger />
            <PageTOCPopoverContent>
              {tocPopoverOptions.header}
              <TOCScrollArea>
                {tocPopoverOptions.style === 'clerk' ? (
                  <TocDefault.TOCItems />
                ) : (
                  <TocClerk.TOCItems />
                )}
              </TOCScrollArea>
              {tocPopoverOptions.footer}
            </PageTOCPopoverContent>
          </PageTOCPopover>
        ))}
      <article
        {...article}
        className={cn(
          'flex min-w-0 w-full flex-col gap-4 pt-8 px-4 md:px-6 md:mx-auto',
          article?.className,
        )}
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
          <PageTOC>
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
                <TocDefault.TOCItems />
              ) : (
                <TocClerk.TOCItems />
              )}
            </TOCScrollArea>
            {tocOptions.footer}
          </PageTOC>
        ))}
    </div>,
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
export const DocsBody = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  (props, ref) => (
    <div ref={ref} {...props} className={cn('prose flex-1', props.className)}>
      {props.children}
    </div>
  ),
);

DocsBody.displayName = 'DocsBody';

export const DocsDescription = forwardRef<
  HTMLParagraphElement,
  ComponentProps<'p'>
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

export const DocsTitle = forwardRef<HTMLHeadingElement, ComponentProps<'h1'>>(
  (props, ref) => {
    return (
      <h1
        ref={ref}
        {...props}
        className={cn('text-[1.75em] font-semibold', props.className)}
      >
        {props.children}
      </h1>
    );
  },
);

DocsTitle.displayName = 'DocsTitle';
