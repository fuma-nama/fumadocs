import { type HTMLAttributes, type ReactNode } from 'react';
import { Badge } from '@/ui/components/method-label';
import type { PropertyProps, RootProps } from '@/render/renderer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ApiProvider } from '@/ui/contexts/api';
import { cn } from 'fumadocs-ui/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

export function Root({
  children,
  baseUrl,
  className,
  shikiOptions,
  servers,
  ...props
}: RootProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-24 text-sm text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <ApiProvider
        servers={servers}
        shikiOptions={shikiOptions}
        defaultBaseUrl={baseUrl}
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
            'calc(var(--fd-nav-height) + var(--fd-banner-height) + var(--fd-tocnav-height, 0px))',
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
  children,
}: PropertyProps) {
  return (
    <div className="rounded-xl border bg-fd-card p-3 prose-no-margin">
      <div className="flex flex-row flex-wrap items-center gap-4 mb-2">
        <code>{name}</code>
        {required ? (
          <Badge color="red" className="text-xs">
            Required
          </Badge>
        ) : null}
        {deprecated ? (
          <Badge color="yellow" className="text-xs">
            Deprecated
          </Badge>
        ) : null}
        <span className="ms-auto text-xs font-mono text-fd-muted-foreground">
          {type}
        </span>
      </div>
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

export function ObjectCollapsible(props: {
  name: string;
  children: ReactNode;
}) {
  return (
    <Collapsible {...props}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'outline', size: 'sm' }),
          'group rounded-full px-2 py-1.5 text-fd-muted-foreground',
        )}
      >
        {props.name}
        <ChevronDown className="size-4 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mx-2">
        <div className="flex flex-col gap-2 p-2">{props.children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { APIPage, type ApiPageProps } from '@/render/api-page';
