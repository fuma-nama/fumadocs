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
  return (
    <div className={cn('flex flex-col gap-24 text-sm', className)} {...props}>
      <ApiProvider
        mediaAdapters={
          Object.fromEntries(
            Object.entries(ctx.mediaAdapters).filter(
              ([_, v]) => typeof v !== 'boolean',
            ),
          ) as Record<string, MediaAdapter>
        }
        servers={ctx.servers}
        shikiOptions={ctx.shikiOptions}
        defaultBaseUrl={ctx.baseUrl}
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
        'flex flex-col gap-3 p-3 text-sm border-x bg-fd-card border-t last:rounded-b-xl first:rounded-t-xl last:border-b',
        nested && 'first:rounded-tl-none',
      )}
    >
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary text-[13px]">
          {name}
          {required === false && (
            <span className="text-fd-muted-foreground">?</span>
          )}
        </span>
        <span className="text-[13px] me-auto font-mono text-fd-muted-foreground">
          {type}
        </span>
        {deprecated && (
          <Badge color="yellow" className="text-xs">
            Deprecated
          </Badge>
        )}
      </div>
      <div className="prose-no-margin empty:hidden">{props.children}</div>
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
    <Collapsible {...props}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'outline', size: 'sm' }),
          'text-fd-muted-foreground group px-3 py-2 data-[state=open]:rounded-b-none',
        )}
      >
        {props.name}
        <ChevronDown className="size-4 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mt-px *:bg-fd-secondary">
        {props.children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export { APIPage, type ApiPageProps } from '@/render/api-page';
