import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { Edit } from '@/icons';
import { I18nLabel } from '@/contexts/i18n';
import { slot } from '@/layouts/shared';
import {
  type BreadcrumbProps,
  type FooterProps,
  PageArticle,
  PageBreadcrumb,
  PageFooter,
  PageLastUpdate,
  PageRoot,
  PageTOC,
  PageTOCItems,
  PageTOCPopover,
  PageTOCPopoverContent,
  PageTOCPopoverItems,
  PageTOCPopoverTrigger,
  PageTOCTitle,
} from '@/layouts/docs/page';
import type { AnchorProviderProps } from 'fumadocs-core/toc';
import type { TOCItemType } from 'fumadocs-core/server';

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
  breadcrumb,
  footer,
  lastUpdate,
  container,
  full = false,
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
  toc = [],
  article,
  children,
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
    <PageRoot
      toc={{
        toc,
        single: tocOptions.single,
      }}
      {...container}
    >
      {slot(
        { enabled: tocPopoverEnabled, component: tocPopoverReplace },
        <PageTOCPopover>
          <PageTOCPopoverTrigger />
          <PageTOCPopoverContent>
            {tocPopoverOptions.header}
            <PageTOCPopoverItems variant={tocPopoverOptions.style} />
            {tocPopoverOptions.footer}
          </PageTOCPopoverContent>
        </PageTOCPopover>,
      )}
      <PageArticle {...article}>
        {slot(breadcrumb, <PageBreadcrumb {...breadcrumb} />)}
        {children}
        <div role="none" className="flex-1" />
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden">
          {editOnGithub && (
            <EditOnGitHub
              href={`https://github.com/${editOnGithub.owner}/${editOnGithub.repo}/blob/${editOnGithub.sha}/${editOnGithub.path.startsWith('/') ? editOnGithub.path.slice(1) : editOnGithub.path}`}
            />
          )}
          {lastUpdate && <PageLastUpdate date={new Date(lastUpdate)} />}
        </div>
        {slot(footer, <PageFooter items={footer?.items} />)}
      </PageArticle>
      {slot(
        { enabled: tocEnabled, component: tocReplace },
        <PageTOC>
          {tocOptions.header}
          <PageTOCTitle />
          <PageTOCItems variant={tocOptions.style} />
          {tocOptions.footer}
        </PageTOC>,
      )}
    </PageRoot>
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
    <div ref={ref} {...props} className={cn('prose', props.className)}>
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
        className={cn('text-3xl font-semibold', props.className)}
      >
        {props.children}
      </h1>
    );
  },
);

DocsTitle.displayName = 'DocsTitle';

/**
 * For separate MDX page
 */
export function withArticle(props: ComponentProps<'main'>): ReactNode {
  return (
    <main {...props} className={cn('container py-12', props.className)}>
      <article className="prose">{props.children}</article>
    </main>
  );
}
