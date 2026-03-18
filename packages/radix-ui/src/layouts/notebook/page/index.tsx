import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { I18nLabel } from '@/contexts/i18n';
import type { AnchorProviderProps, TOCItemType } from 'fumadocs-core/toc';
import type { DocsPageSlots } from './client';
import type { TOCMainProps } from './slots/toc';
import type { TOCPopoverProps } from './slots/toc-popover';
import type { BreadcrumbProps } from './slots/breadcrumb';
import type { FooterProps } from './slots/footer';

export interface DocsPageProps extends ComponentProps<'article'> {
  toc?: TOCItemType[];
  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;
  slots?: DocsPageSlots;

  footer?: FooterOptions;
  breadcrumb?: BreadcrumbOptions;
  tableOfContent?: TableOfContentOptions;
  tableOfContentPopover?: TableOfContentPopoverOptions;
}

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled?: boolean;
  /**
   * @deprecated use `slots.breadcrumb` instead.
   */
  component?: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled?: boolean;
  /**
   * @deprecated use `slots.footer` instead.
   */
  component?: ReactNode;
}

interface TableOfContentOptions extends Pick<AnchorProviderProps, 'single'>, TOCMainProps {
  enabled?: boolean;
  /**
   * @deprecated use `slots.toc` instead.
   */
  component?: ReactNode;
}

interface TableOfContentPopoverOptions extends TOCPopoverProps {
  enabled?: boolean;
  /**
   * @deprecated use `slots.tocPopover` instead.
   */
  component?: ReactNode;
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

export { PageLastUpdate, DocsPage, useDocsPage } from './client';
export * from './slots/toc';
export * from './slots/toc-popover';
export { type BreadcrumbProps, Breadcrumb as PageBreadcrumb } from './slots/breadcrumb';
export { type FooterProps, Footer as PageFooter } from './slots/footer';
export { MarkdownCopyButton, ViewOptionsPopover } from '@/layouts/slots/page-actions';
