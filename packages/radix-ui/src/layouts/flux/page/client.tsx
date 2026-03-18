'use client';

import { type ComponentProps, createContext, type FC, use, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { TOC, type TOCProps } from './slots/toc';
import { Footer, type FooterProps } from './slots/footer';
import { Breadcrumb, type BreadcrumbProps } from './slots/breadcrumb';
import type { DocsPageProps } from '.';
import { TOCProvider, type TOCProviderProps } from '@/components/toc';
import { Container } from './slots/container';

export interface DocsPageSlots {
  toc?: FC<TOCProps>;
  container?: FC<ComponentProps<'article'>>;
  tocProvider?: FC<TOCProviderProps>;
  footer?: FC<FooterProps>;
  breadcrumb?: FC<BreadcrumbProps>;
}

type PageSlotsProps = Pick<DocsPageProps, 'full' | 'breadcrumb' | 'footer' | 'tableOfContent'>;
const PageContext = createContext<{
  props: PageSlotsProps;
  slots: DocsPageSlots;
} | null>(null);

export function useDocsPage() {
  const context = use(PageContext);
  if (!context)
    throw new Error(
      'Please use page components under <DocsPage /> (`fumadocs-ui/layouts/flux/page`).',
    );
  return context;
}

export function DocsPage({
  tableOfContent: { enabled: tocEnabled, single, ...tocProps } = {},
  footer = {},
  breadcrumb = {},
  full = false,
  toc = [],
  slots: defaultSlots = {},
  children,
  ...containerProps
}: DocsPageProps) {
  tocEnabled ??= Boolean(toc.length > 0 || tocProps.header || tocProps.footer);

  const slots: DocsPageSlots = {
    breadcrumb:
      breadcrumb.enabled !== false ? (defaultSlots.breadcrumb ?? InlineBreadcrumb) : undefined,
    footer: footer.enabled !== false ? (defaultSlots.footer ?? InlineFooter) : undefined,
    toc: tocEnabled ? (defaultSlots.toc ?? InlineTOC) : undefined,
    tocProvider: defaultSlots.tocProvider ?? TOCProvider,
    container: defaultSlots.container ?? Container,
  };

  let content = (
    <>
      {slots.toc && <slots.toc />}
      {slots.container && <slots.container {...containerProps}>{children}</slots.container>}
    </>
  );

  if (slots.tocProvider)
    content = (
      <slots.tocProvider single={single} toc={tocEnabled ? toc : []}>
        {content}
      </slots.tocProvider>
    );

  return (
    <PageContext
      value={{
        props: {
          full,
          tableOfContent: tocProps,
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
  const { component, enabled: _, ...rest } = useDocsPage().props?.breadcrumb ?? {};
  if (component) return component;
  return <Breadcrumb {...props} {...rest} />;
}

function InlineFooter(props: FooterProps) {
  const { component, enabled: _, ...rest } = useDocsPage().props?.footer ?? {};
  if (component) return component;
  return <Footer {...props} {...rest} />;
}

function InlineTOC(props: TOCProps) {
  const { component, enabled: _, ...rest } = useDocsPage().props?.tableOfContent ?? {};
  if (component) return component;
  return <TOC {...props} {...rest} />;
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
