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
  PageTOCPopover,
  PageTOCPopoverContent,
  PageTOCPopoverTrigger,
} from './client';
import type { AnchorProviderProps, TOCItemType } from 'fumadocs-core/toc';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import { TOCProvider, TOCScrollArea } from '@/components/toc';

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled?: boolean;
  component?: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled?: boolean;
  component?: ReactNode;
}

export interface DocsPageProps extends ComponentProps<'div'> {
  toc?: TOCItemType[];
  tableOfContent?: TableOfContentOptions;
  tableOfContentPopover?: TableOfContentPopoverOptions;

  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: BreadcrumbOptions;

  /**
   * Footer navigation, located under the page body.
   *
   * You can specify `footer.children` to add extra components under the footer.
   */
  footer?: FooterOptions;
}

type TableOfContentOptions = Pick<AnchorProviderProps, 'single'> & Omit<ComponentProps<'div'>, 'style'> & {
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  enabled?: boolean;
  component?: ReactNode;

  /**
   * @deprecated use `tocStyle` instead
   */
  style?: 'normal' | 'clerk';

  /**
   * @defaultValue 'normal'
   */
  tocStyle?: 'normal' | 'clerk';
};

type TableOfContentPopoverOptions = Omit<TableOfContentOptions, 'single'>;

export function DocsPage({
  breadcrumb: { enabled: breadcrumbEnabled = true, component: breadcrumb, ...breadcrumbProps } = {},
  footer: { enabled: footerEnabled, component: footerReplace, ...footerProps } = {},
  full = false,
  tableOfContentPopover: {
    enabled: tocPopoverEnabled,
    component: tocPopover,
    style: tocPopoverStyle1,
    tocStyle: tocPopoverStyle2,
    header: tocPopoverHeader,
    footer: tocPopoverFooter,
    ...tocPopoverOptions
  } = {},
  tableOfContent: {
     enabled: tocEnabled,
      component: tocReplace,
      style: tocStyle1,
    tocStyle: tocStyle2,
    header: tocHeader,
    footer: tocFooter,
    single: tocSingle,
        ...tocOptions
     } = {},
  toc = [],
  children,
  className,
  ...props
}: DocsPageProps) {
  // disable TOC on full mode, you can still enable it with `enabled` option.
  tocEnabled ??=
    !full && (toc.length > 0 || tocFooter !== undefined || tocHeader !== undefined);

  tocPopoverEnabled ??=
    toc.length > 0 ||
    tocPopoverHeader !== undefined ||
    tocPopoverFooter !== undefined;

  let wrapper = (children: ReactNode) => children;

  if (tocEnabled || tocPopoverEnabled) {
    wrapper = (children) => (
      <TOCProvider single={tocSingle} toc={toc}>
        {children}
      </TOCProvider>
    );
  }

  const tocPopoverStyle = tocPopoverStyle2 ?? tocPopoverStyle1 ?? "normal";
  const tocStyle = tocStyle2 ?? tocStyle1 ?? "normal";

  return wrapper(
    <>
      {tocPopoverEnabled &&
        (tocPopover ?? (
          <PageTOCPopover {...tocPopoverOptions}>
            <PageTOCPopoverTrigger />
            <PageTOCPopoverContent>
              {tocPopoverHeader}
              <TOCScrollArea>
                {tocPopoverStyle === 'clerk' ? (
                  <TocClerk.TOCItems />
                ) : (
                  <TocDefault.TOCItems />
                )}
              </TOCScrollArea>
              {tocPopoverFooter}
            </PageTOCPopoverContent>
          </PageTOCPopover>
        ))}
      <article
        {...props}
        id="nd-page"
        data-full={full}
        className={cn(
          'flex flex-col w-full max-w-[900px] mx-auto [grid-area:main] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14',
          full ? 'max-w-[1168px]' : 'xl:layout:[--fd-toc-width:268px]',
          className,
        )}
      >
        {breadcrumbEnabled && (breadcrumb ?? <PageBreadcrumb {...breadcrumbProps} />)}
        {children}
        {footerEnabled !== false && (footerReplace ?? <PageFooter {...footerProps} />)}
      </article>
      {tocEnabled &&
        (tocReplace ?? (
          <div
          {...tocOptions}
            id="nd-toc"
            className={cn(
              'sticky top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] flex flex-col [grid-area:toc] w-(--fd-toc-width) pt-12 pe-4 pb-2 max-xl:hidden',
              tocOptions.className,
            )}
          >
            {tocHeader}
            <h3
              id="toc-title"
              className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
            >
              <Text className="size-4" />
              <I18nLabel label="toc" />
            </h3>
            <TOCScrollArea>
              {tocStyle === 'clerk' ? <TocClerk.TOCItems /> : <TocDefault.TOCItems />}
            </TOCScrollArea>
            {tocFooter}
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
export function DocsBody({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div {...props} className={cn('prose flex-1', className)}>
      {children}
    </div>
  );
}

export function DocsDescription({ children, className, ...props }: ComponentProps<'p'>) {
  // Don't render if no description provided
  if (children === undefined) return null;

  return (
    <p {...props} className={cn('mb-8 text-lg text-fd-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function DocsTitle({ children, className, ...props }: ComponentProps<'h1'>) {
  return (
    <h1 {...props} className={cn('text-[1.75em] font-semibold', className)}>
      {children}
    </h1>
  );
}

export { PageLastUpdate, PageBreadcrumb } from './client';
export { MarkdownCopyButton, ViewOptionsPopover } from '@/layouts/shared/page-actions';
