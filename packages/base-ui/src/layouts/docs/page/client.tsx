'use client';

import {
  type ComponentProps,
  createContext,
  type FC,
  type ReactNode,
  use,
  useEffect,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { TOC, type TOCProps } from './slots/toc';
import { TOCPopover, type TOCPopoverProps } from './slots/toc-popover';
import { Footer, type FooterProps } from './slots/footer';
import { Breadcrumb, type BreadcrumbProps } from './slots/breadcrumb';
import { TOCProvider, type TOCProviderProps } from '@/components/toc';
import { Container } from './slots/container';
import type { TOCItemType } from 'fumadocs-core/toc';

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

interface TableOfContentOptions extends Pick<TOCProviderProps, 'single'>, TOCProps {
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

export interface DocsPageSlots {
  toc?: FC<TOCProps>;
  container?: FC<ComponentProps<'article'>>;
  tocPopover?: FC<TOCPopoverProps>;
  tocProvider?: FC<TOCProviderProps>;
  footer?: FC<FooterProps>;
  breadcrumb?: FC<BreadcrumbProps>;
}

interface PageSlotsProps extends Pick<DocsPageProps, 'full' | 'breadcrumb' | 'footer'> {
  tableOfContent: TOCProps & { component?: ReactNode };
  tableOfContentPopover: TOCPopoverProps & { component?: ReactNode };
}

const PageContext = createContext<{
  props: PageSlotsProps;
  slots: DocsPageSlots;
} | null>(null);

export function useDocsPage() {
  const context = use(PageContext);
  if (!context)
    throw new Error(
      'Please use page components under <DocsPage /> (`fumadocs-ui/layouts/docs/page`).',
    );
  return context;
}

export function DocsPage({
  tableOfContent: { enabled: tocEnabled, single = false, ...tocProps } = {},
  tableOfContentPopover: { enabled: tocPopoverEnabled, ...tocPopoverProps } = {},
  footer = {},
  breadcrumb = {},
  full = false,
  toc = [],
  slots: defaultSlots = {},
  children,
  ...containerProps
}: DocsPageProps) {
  tocEnabled ??= Boolean(!full && (toc.length > 0 || tocProps.footer || tocProps.header));
  tocPopoverEnabled ??= Boolean(toc.length > 0 || tocPopoverProps.header || tocPopoverProps.footer);

  const slots: DocsPageSlots = {
    breadcrumb:
      breadcrumb.enabled !== false ? (defaultSlots.breadcrumb ?? InlineBreadcrumb) : undefined,
    footer: footer.enabled !== false ? (defaultSlots.footer ?? InlineFooter) : undefined,
    toc: tocEnabled ? (defaultSlots.toc ?? InlineTOC) : undefined,
    tocPopover: tocPopoverEnabled ? (defaultSlots.tocPopover ?? InlineTOCPopover) : undefined,
    tocProvider: defaultSlots.tocProvider ?? TOCProvider,
    container: defaultSlots.container ?? Container,
  };

  let content = (
    <>
      {slots.tocPopover && <slots.tocPopover />}
      {slots.container && (
        <slots.container {...containerProps}>
          {slots.breadcrumb && <slots.breadcrumb />}
          {children}
          {slots.footer && <slots.footer />}
        </slots.container>
      )}
      {slots.toc && <slots.toc />}
    </>
  );

  if (slots.tocProvider)
    content = (
      <slots.tocProvider single={single} toc={tocEnabled || tocPopoverEnabled ? toc : []}>
        {content}
      </slots.tocProvider>
    );

  return (
    <PageContext
      value={{
        props: {
          full,
          tableOfContent: tocProps,
          tableOfContentPopover: tocPopoverProps,
          footer,
          breadcrumb,
        },
        slots,
      }}
    >
      {content}
    </PageContext>
  );
}

function InlineBreadcrumb(props: BreadcrumbProps) {
  const { component, enabled: _, ...rest } = useDocsPage().props.breadcrumb ?? {};
  if (component) return component;
  return <Breadcrumb {...props} {...rest} />;
}

function InlineFooter(props: FooterProps) {
  const { component, enabled: _, ...rest } = useDocsPage().props.footer ?? {};
  if (component) return component;
  return <Footer {...props} {...rest} />;
}

function InlineTOCPopover(props: TOCPopoverProps) {
  const { tableOfContentPopover } = useDocsPage().props;
  if (tableOfContentPopover.component) return tableOfContentPopover.component;
  return <TOCPopover {...props} {...tableOfContentPopover} />;
}

function InlineTOC(props: TOCProps) {
  const { tableOfContent } = useDocsPage().props;
  if (tableOfContent.component) return tableOfContent.component;
  return <TOC {...props} {...tableOfContent} />;
}

export function PageLastUpdate({
  date: value,
  ...props
}: Omit<ComponentProps<'p'>, 'children'> & { date: Date }) {
  const { text } = useI18n();
  const [date, setDate] = useState('');

  useEffect(() => {
    // to the timezone of client
    setDate(value.toLocaleDateString());
  }, [value]);

  return (
    <p {...props} className={cn('text-sm text-fd-muted-foreground', props.className)}>
      {text.lastUpdate} {date}
    </p>
  );
}
