import { type ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import {
  type BreadcrumbProps,
  type FooterProps,
  PageBreadcrumb,
  PageFooter,
  PageLastUpdate,
  PageTOC,
  PageTOCPopover,
  PageTOCPopoverContent,
  PageTOCPopoverTrigger,
  type RootProps,
} from './page-client';
import { TOCItems, TOCProvider, TOCScrollArea } from '@/components/layout/toc';
import { Text } from 'lucide-react';
import { I18nLabel } from '@/contexts/i18n';
import ClerkTOCItems from '@/components/layout/toc-clerk';

/**
 * Apply `prose` on div
 */
export function PageProse(props: ComponentProps<'div'>) {
  return (
    <div {...props} className={cn('prose', props.className)}>
      {props.children}
    </div>
  );
}

export function PageTOCTitle(props: ComponentProps<'h2'>) {
  return (
    <h3
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground',
        props.className,
      )}
    >
      <Text className="size-4" />
      <I18nLabel label="toc" />
    </h3>
  );
}

export function PageTOCItems({
  variant = 'normal',
  ...props
}: ComponentProps<'div'> & { variant?: 'clerk' | 'normal' }) {
  return (
    <TOCScrollArea {...props}>
      {variant === 'clerk' ? <ClerkTOCItems /> : <TOCItems />}
    </TOCScrollArea>
  );
}

export function PageTOCPopoverItems({
  variant = 'normal',
  ...props
}: ComponentProps<'div'> & { variant?: 'clerk' | 'normal' }) {
  return (
    <TOCScrollArea {...props}>
      {variant === 'clerk' ? <ClerkTOCItems /> : <TOCItems />}
    </TOCScrollArea>
  );
}

export function PageArticle(props: ComponentProps<'article'>) {
  return (
    <article
      {...props}
      className={cn(
        'flex min-w-0 w-full flex-col gap-4 px-4 pt-8 md:px-6 md:mx-auto xl:pt-12 xl:px-12',
        props.className,
      )}
    >
      {props.children}
    </article>
  );
}

export function PageRoot({ toc, children, ...props }: RootProps) {
  return (
    <TOCProvider {...toc}>
      <div
        id="nd-page"
        {...props}
        className={cn(
          'flex flex-1 w-full mx-auto max-w-(--fd-page-width) pt-(--fd-tocnav-height)',
          props.className,
        )}
      >
        {children}
      </div>
    </TOCProvider>
  );
}

export {
  PageBreadcrumb,
  PageFooter,
  PageLastUpdate,
  PageTOC,
  PageTOCPopover,
  PageTOCPopoverTrigger,
  PageTOCPopoverContent,
  type FooterProps,
  type BreadcrumbProps,
  type RootProps,
};
