import { cn } from 'fumadocs-ui/components/api';
import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { badgeVariants, getBadgeColor } from '@/ui/components/variants';
import type { APIInfoProps, PropertyProps } from '@/render/renderer';
import { CopyRouteButton } from '@/ui/client';

export { Root, useSchemaContext, APIPlayground } from './client';

function Route({ route }: { route: string }): ReactNode {
  const segments = route.split('/').filter((part) => part.length > 0);

  return (
    <div className="flex flex-row flex-wrap items-center gap-1 text-sm">
      {segments.map((part, index) => (
        <Fragment key={index}>
          <span className="text-fd-muted-foreground">/</span>
          {part.startsWith('{') && part.endsWith('}') ? (
            <code className="text-fd-primary">{part}</code>
          ) : (
            <span className="text-fd-foreground">{part}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export function APIInfo({
  children,
  className,
  route,
  badgeClassname,
  method = 'GET',
  ...props
}: APIInfoProps &
  HTMLAttributes<HTMLDivElement> & {
    badgeClassname?: string;
  }): React.ReactElement {
  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      <div
        className={cn(
          'sticky top-24 z-20 mb-4 flex flex-row items-center gap-2 rounded-lg border bg-fd-card px-3 py-2 md:top-12 lg:top-1',
        )}
      >
        <span
          className={cn(
            badgeVariants({ color: getBadgeColor(method) }),
            badgeClassname,
          )}
        >
          {method}
        </span>
        <Route route={route} />

        <CopyRouteButton className="ms-auto size-6 p-1" route={route} />
      </div>

      <div className="prose-no-margin">{children}</div>
    </div>
  );
}

export function API({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col gap-x-6 gap-y-4 xl:flex-row xl:items-start',
        className,
      )}
      {...props}
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
}: PropertyProps): React.ReactElement {
  return (
    <div className="mb-4 rounded-lg border bg-fd-card p-3 prose-no-margin">
      <h4 className="flex flex-row items-center gap-4">
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

export function APIExample({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'prose-no-margin md:sticky md:top-12 lg:top-1 xl:w-[400px]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ObjectCollapsible(props: {
  name: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <Accordions type="single">
      <Accordion title={props.name}>{props.children}</Accordion>
    </Accordions>
  );
}
