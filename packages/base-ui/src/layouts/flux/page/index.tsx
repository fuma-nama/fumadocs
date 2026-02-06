import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { Edit } from 'lucide-react';
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
   * Footer navigation, located under the page body.
   *
   * You can specify `footer.children` to add extra components under the footer.
   */
  footer?: Partial<FooterOptions>;

  children?: ReactNode;

  /**
   * Apply class names to the `#nd-page` container.
   */
  className?: string;
}

interface TableOfContentOptions extends Pick<AnchorProviderProps, 'single'> {
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
}

export function DocsPage({
  breadcrumb: { enabled: breadcrumbEnabled = true, component: breadcrumb, ...breadcrumbProps } = {},
  footer: { enabled: footerEnabled, component: footerReplace, ...footerProps } = {},
  full = false,
  tableOfContent: { enabled: tocPopoverEnabled, component: tocPopover, ...tocOptions } = {},
  toc = [],
  children,
  className,
}: DocsPageProps) {
  tocPopoverEnabled ??=
    toc.length > 0 || tocOptions.header !== undefined || tocOptions.footer !== undefined;

  let wrapper = (children: ReactNode) => children;

  if (tocPopoverEnabled) {
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
            <PageTOCPopoverContent>
              {tocOptions.header}
              <TOCScrollArea>
                {tocOptions.style === 'clerk' ? <TocClerk.TOCItems /> : <TocDefault.TOCItems />}
              </TOCScrollArea>
              {tocOptions.footer}
            </PageTOCPopoverContent>
            <PageTOCPopoverTrigger />
          </PageTOCPopover>
        ))}
      <article
        id="nd-page"
        data-full={full}
        className={cn(
          'flex flex-col w-full max-w-[900px] mx-auto [grid-area:main] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14',
          full ? 'max-w-[1200px]' : 'xl:layout:[--fd-toc-width:268px]',
          className,
        )}
      >
        {breadcrumbEnabled && (breadcrumb ?? <PageBreadcrumb {...breadcrumbProps} />)}
        {children}
        {footerEnabled !== false && (footerReplace ?? <PageFooter {...footerProps} />)}
      </article>
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
