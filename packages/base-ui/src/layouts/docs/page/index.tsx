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
import { ChildrenRenderer, renderer, type Renderer } from '@/utils/renderer';

export interface DocsPageProps {
  toc?: TOCItemType[];
  /**
   * - `multiple` (default): Accept multiple active items
   * - `single`: Only accept one active item at most
   * */
  tocMode?: 'single' | 'multiple';
  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;
  children?: ReactNode;

  TOC?: Renderer<TOCMainProps>;
  TOCPopover?: Renderer<TOCPopoverProps>;
  /** Footer navigation, located under the page body. */
  Footer?: Renderer<FooterProps>;
  Container?: Renderer<ComponentProps<'div'>>;
  Breadcrumb?: Renderer<BreadcrumbProps>;

  /** @deprecated use `Footer` instead. */
  footer?: FooterOptions;
  /** @deprecated use `Container` instead. */
  className?: string;
  /** @deprecated use `Breadcrumb` instead. */
  breadcrumb?: BreadcrumbOptions;
  /** @deprecated use `TOC` instead, or `tocMode` for enabling `single`. */
  tableOfContent?: TableOfContentOptions;
  /** @deprecated use `TOCPopover` instead. */
  tableOfContentPopover?: TableOfContentPopoverOptions;
}

interface BreadcrumbOptions extends BreadcrumbProps {
  enabled?: boolean;
  component?: ReactNode;
}

interface FooterOptions extends FooterProps {
  enabled?: boolean;
  component?: ReactNode;
}

interface TableOfContentOptions extends Pick<AnchorProviderProps, 'single'>, TOCProps {
  enabled?: boolean;
  component?: ReactNode;
}

interface TableOfContentPopoverOptions extends TOCProps {
  enabled?: boolean;
  component?: ReactNode;
}

export function DocsPage({
  tableOfContent: tocProps = {},
  TOC: TOCRenderer,
  tableOfContentPopover: tocPopoverProps = {},
  TOCPopover: TOCPopoverRenderer,
  footer = {},
  Footer = footer.enabled === false
    ? false
    : footer.component
      ? new ChildrenRenderer(footer.component)
      : footer,
  className,
  Container = { className },
  breadcrumb = {},
  Breadcrumb = breadcrumb.enabled === false
    ? false
    : breadcrumb.component
      ? new ChildrenRenderer(breadcrumb.component)
      : breadcrumb,
  full = false,
  toc = [],
  tocMode = tocProps.single ? 'single' : 'multiple',
  children,
}: DocsPageProps) {
  // force disable toc in full mode
  if (full) {
    TOCRenderer = false;
  } else if (tocProps.enabled ?? (toc.length > 0 || !!tocProps.footer || !!tocProps.header)) {
    TOCRenderer ??= tocProps.component ? new ChildrenRenderer(tocProps.component) : tocProps;
  } else {
    TOCRenderer ??= false;
  }

  if (
    tocPopoverProps.enabled ??
    (toc.length > 0 || !!tocPopoverProps.header || !!tocPopoverProps.footer)
  ) {
    TOCPopoverRenderer ??= tocPopoverProps.component
      ? new ChildrenRenderer(tocPopoverProps.component)
      : tocPopoverProps;
  } else {
    TOCPopoverRenderer ??= false;
  }

  const renderBreadcrumb = renderer(Breadcrumb, PageBreadcrumb);
  const renderFooter = renderer(Footer, PageFooter);
  const renderContainer = renderer(Container, 'article');
  const renderToc = renderer(TOCRenderer, TOC);
  const renderTocPopover = renderer(TOCPopoverRenderer, TOCPopover);

  return (
    <TOCProvider single={tocMode === 'single'} toc={renderToc || renderTocPopover ? toc : []}>
      {renderTocPopover?.((t) => t ?? {})}
      {renderContainer?.((t) => ({
        id: 'nd-page',
        'data-full': full,
        children: (
          <>
            {renderBreadcrumb?.((t) => t ?? {})}
            {children}
            {renderFooter?.((t) => t ?? {})}
          </>
        ),
        ...t,
        className: cn(
          'flex flex-col w-full max-w-[900px] mx-auto [grid-area:main] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14',
          full ? 'max-w-[1168px]' : 'xl:layout:[--fd-toc-width:268px]',
          t?.className,
        ),
      }))}
      {renderToc?.((t) => t ?? {})}
    </TOCProvider>
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

export interface TOCPopoverProps extends TOCProps {
  container?: ComponentProps<typeof PageTOCPopover>;
  trigger?: ComponentProps<typeof PageTOCPopoverTrigger>;
  content?: ComponentProps<typeof PageTOCPopoverContent>;
}

export interface TOCMainProps extends TOCProps {
  container?: ComponentProps<typeof PageTOCPopover>;
}

interface TOCProps {
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  /**
   * @defaultValue 'normal'
   */
  style?: 'normal' | 'clerk';
}

export function TOC({ container, header, footer, style }: TOCMainProps) {
  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'sticky top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] flex flex-col [grid-area:toc] w-(--fd-toc-width) pt-12 pe-4 pb-2 max-xl:hidden',
        container?.className,
      )}
    >
      {header}
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        <I18nLabel label="toc" />
      </h3>
      <TOCScrollArea>
        {style === 'clerk' ? <TocClerk.TOCItems /> : <TocDefault.TOCItems />}
      </TOCScrollArea>
      {footer}
    </div>
  );
}

export function TOCPopover({
  container,
  trigger,
  content,
  header,
  footer,
  style,
}: TOCPopoverProps) {
  return (
    <PageTOCPopover {...container}>
      <PageTOCPopoverTrigger {...trigger} />
      <PageTOCPopoverContent {...content}>
        {header}
        <TOCScrollArea>
          {style === 'clerk' ? <TocClerk.TOCItems /> : <TocDefault.TOCItems />}
        </TOCScrollArea>
        {footer}
      </PageTOCPopoverContent>
    </PageTOCPopover>
  );
}

export { PageLastUpdate, PageBreadcrumb } from './client';
export { MarkdownCopyButton, ViewOptionsPopover } from '@/layouts/shared/page-actions';
