import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { I18nLabel } from '@/contexts/i18n';
import type { AnchorProviderProps, TOCItemType } from 'fumadocs-core/toc';
import { TOCProvider, TOCScrollArea } from '@/components/toc';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import { Edit, Text } from 'lucide-react';
import {
  BreadcrumbProps,
  FooterProps,
  PageBreadcrumb,
  PageFooter,
  PageTOC,
  PageTOCPopover,
  PageTOCPopoverContent,
  PageTOCPopoverTrigger,
} from './client';

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
  breadcrumb: {
    enabled: breadcrumbEnabled = true,
    component: breadcrumb,
    ...breadcrumbProps
  } = {},
  footer = {},
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

export { PageLastUpdate, PageBreadcrumb } from './client';
