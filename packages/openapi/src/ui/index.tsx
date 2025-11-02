import type { HTMLAttributes } from 'react';
import type { RootProps } from '@/ui/renderer';
import { ApiProvider } from '@/ui/lazy';
import { cn } from 'fumadocs-ui/utils/cn';
import type { MediaAdapter } from '@/requests/media/adapter';

export function Root({
  children,
  className,
  ctx,
  ...props
}: RootProps & HTMLAttributes<HTMLDivElement>) {
  const mediaAdapters: Record<string, MediaAdapter> = {};
  for (const k in ctx.mediaAdapters) {
    const adapter = ctx.mediaAdapters[k];

    if (adapter.client) mediaAdapters[k] = adapter.client;
  }

  return (
    <div className={cn('flex flex-col gap-24 text-sm', className)} {...props}>
      <ApiProvider
        mediaAdapters={mediaAdapters}
        servers={ctx.servers}
        shikiOptions={ctx.shikiOptions}
      >
        {children}
      </ApiProvider>
    </div>
  );
}

export function APIInfo({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      {props.children}
    </div>
  );
}

export function API({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col gap-x-6 gap-y-4 xl:flex-row xl:items-start',
        props.className,
      )}
      style={
        {
          '--fd-api-info-top':
            'calc(12px + var(--fd-nav-height) + var(--fd-banner-height) + var(--fd-tocnav-height, 0px))',
          ...props.style,
        } as object
      }
    >
      {children}
    </div>
  );
}

export function APIExample(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'prose-no-margin md:sticky md:top-(--fd-api-info-top) xl:w-[400px]',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export { Property, ObjectCollapsible } from '@/ui/schema/ui';
export { APIPage, type ApiPageProps } from '@/ui/api-page';
