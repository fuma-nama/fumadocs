import { type HTMLAttributes, type ReactNode } from 'react';
import { Badge } from '@/ui/components/method-label';
import type { PropertyProps, RootProps } from '@/render/renderer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ApiProvider } from '@/ui/lazy';
import { cn } from 'fumadocs-ui/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import type { MediaAdapter } from '@/media/adapter';

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

export function Property({
  name,
  type,
  required,
  deprecated,
  nested,
  ...props
}: PropertyProps) {
  return (
    <div
      className={cn(
        'text-sm border-t',
        nested
          ? 'p-3 border-x bg-fd-card last:rounded-b-xl first:rounded-tr-xl last:border-b'
          : 'py-4 first:border-t-0',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 not-prose">
        <span className="font-medium font-mono text-fd-primary">
          {name}
          {required === false && (
            <span className="text-fd-muted-foreground">?</span>
          )}
        </span>
        <span className="me-auto text-xs font-mono text-fd-muted-foreground">
          {type}
        </span>
        {deprecated && (
          <Badge color="yellow" className="text-xs">
            Deprecated
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">
        {props.children}
      </div>
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

export function ObjectCollapsible(props: {
  name: string;
  children: ReactNode;
}) {
  return (
    <Collapsible className="my-2" {...props}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'secondary', size: 'sm' }),
          'group px-3 py-2 data-[state=open]:rounded-b-none',
        )}
      >
        {props.name}
        <ChevronDown className="size-4 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mt-px *:bg-fd-card">
        {props.children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export { APIPage } from '@/render/api-page';
export { type ApiPageProps, APIPageInner } from '@/render/api-page-inner';
