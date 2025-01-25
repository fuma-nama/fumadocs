import { cn } from 'fumadocs-ui/components/api';
import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { badgeVariants, getBadgeColor } from '@/ui/components/variants';
import type { APIInfoProps, PropertyProps } from '@/render/renderer';
import { CopyRouteButton, ServerSelect } from '@/ui/client';
import { CollapsiblePanel } from '@/ui/components/collapsible';

export {
  Root,
  useSchemaContext,
  APIPlayground,
  ScalarPlayground,
  ScalarProvider,
} from './client';

function Route({ route }: { route: string }): ReactNode {
  const segments = route.split('/').filter((part) => part.length > 0);

  return (
    <div className="not-prose flex flex-row items-center gap-0.5 overflow-auto text-nowrap text-xs">
      {segments.map((part, index) => (
        <Fragment key={index}>
          <span className="text-fd-muted-foreground">/</span>
          {part.startsWith('{') && part.endsWith('}') ? (
            <code className="bg-fd-primary/10 text-fd-primary">{part}</code>
          ) : (
            <code className="text-fd-foreground">{part}</code>
          )}
        </Fragment>
      ))}
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

export function APIInfoHeader({
  method,
  route,
}: Omit<APIInfoProps, 'head' | 'children'>) {
  return (
    <div className="not-prose mb-4 rounded-lg border bg-fd-card p-3 text-fd-card-foreground shadow-lg">
      <div className="flex flex-row items-center gap-1.5">
        <span className={cn(badgeVariants({ color: getBadgeColor(method) }))}>
          {method}
        </span>
        <Route route={route} />
        <CopyRouteButton className="ms-auto size-6 p-1.5" route={route} />
      </div>
      <ServerSelect />
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
    <div className="mb-4 rounded-xl border bg-fd-card p-3 prose-no-margin">
      <h4 className="flex flex-row flex-wrap items-center gap-4">
        <code>{name}</code>
        {required ? (
          <div className={cn(badgeVariants({ color: 'red' }))}>Required</div>
        ) : null}
        {deprecated ? (
          <div className={cn(badgeVariants({ color: 'yellow' }))}>
            Deprecated
          </div>
        ) : null}
        <span className="ms-auto font-mono text-[13px] text-fd-muted-foreground">
          {type}
        </span>
      </h4>
      {children}
    </div>
  );
}

export function APIExample(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'prose-no-margin md:sticky md:top-[var(--fd-api-info-top)] xl:w-[400px]',
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
    <CollapsiblePanel title={props.name}>{props.children}</CollapsiblePanel>
  );
}
