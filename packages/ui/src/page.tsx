import type { TableOfContents } from 'fumadocs-core/server';
import {
  type ComponentProps,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { AnchorProvider, type AnchorProviderProps } from 'fumadocs-core/toc';
import { slot } from '@/layouts/shared';
import { cn } from './utils/cn';
import {
  Breadcrumb,
  type BreadcrumbProps,
  Footer,
  type FooterProps,
  LastUpdate,
  PageArticle,
  PageBody,
  TocPopover,
  TocPopoverContent,
  TocPopoverTrigger,
} from './page-client';
import {
  Toc,
  TOCItems,
  type TOCProps,
  TOCScrollArea,
} from '@/components/layout/toc';
import { buttonVariants } from '@/components/ui/button';
import { Edit, Text } from 'lucide-react';
import { I18nLabel } from '@/contexts/i18n';
import ClerkTOCItems from '@/components/layout/toc-clerk';

type TableOfContentOptions = Omit<TOCProps, 'items' | 'children'> &
  Pick<AnchorProviderProps, 'single'> & {
    enabled: boolean;
    component: ReactNode;

    /**
     * @defaultValue 'normal'
     */
    style?: 'normal' | 'clerk';
  };

type TableOfContentPopoverOptions = Omit<TableOfContentOptions, 'single'>;

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

  /**
   * Show the full path to the current page
   *
   * @defaultValue false
   * @deprecated use `includePage` instead
   */
  full?: boolean;
}

interface FooterOptions extends FooterProps {
  enabled: boolean;
  component: ReactNode;
}

export interface DocsPageProps {
  toc?: TableOfContents;

  /**
   * Extend the page to fill all available space
   *
   * @defaultValue false
   */
  full?: boolean;

  tableOfContent?: Partial<TableOfContentOptions>;
  tableOfContentPopover?: Partial<TableOfContentPopoverOptions>;

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

  container?: HTMLAttributes<HTMLDivElement>;
  article?: HTMLAttributes<HTMLElement>;
  children: ReactNode;
}

export function DocsPage({
  toc = [],
  full = false,
  editOnGithub,
  tableOfContentPopover: {
    enabled: tocPopoverEnabled,
    component: tocPopoverReplace,
    ...tocPopoverOptions
  } = {},
  tableOfContent: {
    enabled: tocEnabled,
    component: tocReplace,
    ...tocOptions
  } = {},
  ...props
}: DocsPageProps) {
  const isTocRequired =
    toc.length > 0 ||
    tocOptions.footer !== undefined ||
    tocOptions.header !== undefined;

  // disable TOC on full mode, you can still enable it with `enabled` option.
  tocEnabled ??= !full && isTocRequired;

  tocPopoverEnabled ??=
    toc.length > 0 ||
    tocPopoverOptions.header !== undefined ||
    tocPopoverOptions.footer !== undefined;

  return (
    <AnchorProvider toc={toc} single={tocOptions.single}>
      <PageBody
        {...props.container}
        className={cn(props.container?.className)}
        style={
          {
            '--fd-tocnav-height': !tocPopoverEnabled ? '0px' : undefined,
            ...props.container?.style,
          } as object
        }
      >
        {slot(
          { enabled: tocPopoverEnabled, component: tocPopoverReplace },
          <TocPopover className="h-10">
            <TocPopoverTrigger className="w-full" items={toc} />
            <TocPopoverContent>
              {tocPopoverOptions.header}
              <TOCScrollArea isMenu>
                {tocPopoverOptions.style === 'clerk' ? (
                  <ClerkTOCItems items={toc} />
                ) : (
                  <TOCItems items={toc} />
                )}
              </TOCScrollArea>
              {tocPopoverOptions.footer}
            </TocPopoverContent>
          </TocPopover>,
          {
            items: toc,
            ...tocPopoverOptions,
          },
        )}
        <PageArticle
          {...props.article}
          className={cn(
            full || !tocEnabled ? 'max-w-[1120px]' : 'max-w-[860px]',
            props.article?.className,
          )}
        >
          {slot(props.breadcrumb, <Breadcrumb {...props.breadcrumb} />)}
          {props.children}
          <div role="none" className="flex-1" />
          <div className="flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden">
            {editOnGithub && (
              <EditOnGitHub
                href={`https://github.com/${editOnGithub.owner}/${editOnGithub.repo}/blob/${editOnGithub.sha}/${editOnGithub.path.startsWith('/') ? editOnGithub.path.slice(1) : editOnGithub.path}`}
              />
            )}
            {props.lastUpdate && (
              <LastUpdate date={new Date(props.lastUpdate)} />
            )}
          </div>
          {slot(props.footer, <Footer items={props.footer?.items} />)}
        </PageArticle>
      </PageBody>
      {slot(
        { enabled: tocEnabled, component: tocReplace },
        <Toc>
          {tocOptions.header}
          <h3 className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
            <Text className="size-4" />
            <I18nLabel label="toc" />
          </h3>
          <TOCScrollArea>
            {tocOptions.style === 'clerk' ? (
              <ClerkTOCItems items={toc} />
            ) : (
              <TOCItems items={toc} />
            )}
          </TOCScrollArea>
          {tocOptions.footer}
        </Toc>,
        {
          items: toc,
          ...tocOptions,
        },
      )}
    </AnchorProvider>
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
export const DocsBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <div ref={ref} {...props} className={cn('prose', props.className)}>
    {props.children}
  </div>
));

DocsBody.displayName = 'DocsBody';

export const DocsDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
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

export const DocsTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>((props, ref) => {
  return (
    <h1
      ref={ref}
      {...props}
      className={cn('text-3xl font-semibold', props.className)}
    >
      {props.children}
    </h1>
  );
});

DocsTitle.displayName = 'DocsTitle';

/**
 * For separate MDX page
 */
export function withArticle({ children }: { children: ReactNode }): ReactNode {
  return (
    <main className="container py-12">
      <article className="prose">{children}</article>
    </main>
  );
}
