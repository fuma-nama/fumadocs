import { cn } from 'fumadocs-ui/components/api';
import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { badgeVariants, getBadgeColor } from '@/ui/components/variants';
import type { APIInfoProps, PropertyProps } from '@/render/renderer';
import { BaseUrlSelect, CopyRouteButton } from '@/ui/client';

export { Root, useSchemaContext, APIPlayground } from './client';

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
  route,
  badgeClassname,
  baseUrls,
  method = 'GET',
  head,
  ...props
}: APIInfoProps &
  HTMLAttributes<HTMLDivElement> & {
    badgeClassname?: string;
  }) {
  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      {head}
      <div className="sticky top-[var(--fd-api-info-top)] z-[4] mb-4 border-b border-fd-foreground/10 bg-fd-card/50 px-4 py-1.5 shadow-lg backdrop-blur-lg max-lg:-mx-3 max-md:-mx-4 md:rounded-xl md:border md:px-1.5">
        <div className="flex flex-row items-center gap-1.5">
          <span
            className={cn(
              badgeVariants({ color: getBadgeColor(method) }),
              badgeClassname,
            )}
          >
            {method}
          </span>
          <Route route={route} />
          <CopyRouteButton className="ms-auto size-6 p-1.5" route={route} />
        </div>
        <BaseUrlSelect baseUrls={baseUrls} />
      </div>
      <div className="prose-no-margin">{props.children}</div>
    </div>
  );
}

export function API({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col gap-x-6 gap-y-4 max-xl:[--fd-toc-height:46px] max-md:[--fd-toc-height:36px] xl:flex-row xl:items-start',
        props.className,
      )}
      style={
        {
          '--fd-api-info-top':
            'calc(var(--fd-nav-height) + var(--fd-banner-height) + var(--fd-toc-height, 0.5rem))',
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
    <div className="mb-4 rounded-lg border bg-fd-card p-3 prose-no-margin">
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
    <Accordions type="single">
      <Accordion title={props.name}>{props.children}</Accordion>
    </Accordions>
  );
}
