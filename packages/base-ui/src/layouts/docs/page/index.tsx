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
import { I18nLabel, useTranslations } from '@/contexts/i18n';
import {
  TOC,
  TOCPopover,
  TOCProvider,
  type TOCProviderProps,
  type TOCPopoverProps,
  type TOCProps,
} from './slots/toc';
import { Footer, type FooterProps } from './slots/footer';
import { Breadcrumb, type BreadcrumbProps } from './slots/breadcrumb';
import { Container } from './slots/container';
import type { TOCItemType } from 'fumadocs-core/toc';
import { buttonVariants } from '@/components/ui/button';
import { Edit } from 'lucide-react';

export interface DocsPageProps extends ComponentProps<'article'> {
  toc?: TOCItemType[];

  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean | undefined;
  slots?: Partial<DocsPageSlots>;

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

type TableOfContentOptions = Pick<TOCProviderProps, 'single'> &
  TOCProps & {
    enabled?: boolean;
    /**
     * @deprecated use `slots.toc` instead.
     */
    component?: ReactNode;
  };

type TableOfContentPopoverOptions = TOCPopoverProps & {
  enabled?: boolean;
  /**
   * @deprecated use `slots.tocPopover` instead.
   */
  component?: ReactNode;
};

interface DocsPageSlots {
  toc: {
    provider: FC<TOCProviderProps>;
    main: FC<TOCProps>;
    popover: FC<TOCPopoverProps>;
  };
  container: FC<ComponentProps<'article'>>;
  footer: FC<FooterProps>;
  breadcrumb: FC<BreadcrumbProps>;
}

const PageContext = createContext<{
  full: NonNullable<DocsPageProps['full']>;
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
  full = false,
  tableOfContent: { enabled: tocEnabled = !full, single, ...tocProps } = {},
  tableOfContentPopover: { enabled: tocPopoverEnabled, ...tocPopoverProps } = {},
  breadcrumb: { enabled: breadcrumbEnabled = true, ...breadcrumb } = {},
  footer: { enabled: footerEnabled = true, ...footer } = {},
  toc = [],
  slots: defaultSlots = {},
  children,
  ...containerProps
}: DocsPageProps) {
  tocPopoverEnabled ??= Boolean(toc.length > 0 || tocPopoverProps.header || tocPopoverProps.footer);

  const slots: DocsPageSlots = {
    breadcrumb: defaultSlots.breadcrumb ?? Breadcrumb,
    footer: defaultSlots.footer ?? Footer,
    toc: defaultSlots.toc ?? {
      provider: TOCProvider,
      main: TOC,
      popover: TOCPopover,
    },
    container: defaultSlots.container ?? Container,
  };

  return (
    <PageContext
      value={{
        full,
        slots,
      }}
    >
      <slots.toc.provider single={single} toc={tocEnabled || tocPopoverEnabled ? toc : []}>
        {tocPopoverEnabled &&
          (tocPopoverProps.component ?? <slots.toc.popover {...tocPopoverProps} />)}
        <slots.container {...containerProps}>
          {breadcrumbEnabled && (breadcrumb.component ?? <slots.breadcrumb {...breadcrumb} />)}
          {children}
          {footerEnabled && (footer.component ?? <slots.footer {...footer} />)}
        </slots.container>
        {tocEnabled && (tocProps.component ?? <slots.toc.main {...tocProps} />)}
      </slots.toc.provider>
    </PageContext>
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
        }),
        'gap-1.5 not-prose',
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

export function PageLastUpdate({
  date: value,
  ...props
}: Omit<ComponentProps<'p'>, 'children'> & { date: Date }) {
  const t = useTranslations();
  const [date, setDate] = useState('');

  useEffect(() => {
    // to the timezone of client
    setDate(value.toLocaleDateString());
  }, [value]);

  return (
    <p {...props} className={cn('text-sm text-fd-muted-foreground', props.className)}>
      {t.lastUpdate} {date}
    </p>
  );
}

export { type BreadcrumbProps, Breadcrumb as PageBreadcrumb } from './slots/breadcrumb';
export { type FooterProps, Footer as PageFooter } from './slots/footer';
export { MarkdownCopyButton, ViewOptionsPopover } from '@/layouts/shared/page-actions';
