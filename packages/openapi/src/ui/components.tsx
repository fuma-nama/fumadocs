import {
  type ButtonHTMLAttributes,
  Fragment,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, Copy } from 'lucide-react';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { cn, useCopyButton, buttonVariants } from 'fumadocs-ui/components/api';
import { badgeVariants, getBadgeColor } from '@/ui/shared';
import { ApiProvider, useApiContext } from '@/ui/contexts/api';

export interface RootProps extends HTMLAttributes<HTMLDivElement> {
  baseUrl?: string;
}

export function Root({
  children,
  baseUrl,
  className,
  ...props
}: RootProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col gap-24 text-sm text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <ApiProvider defaultBaseUrl={baseUrl}>{children}</ApiProvider>
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
        'flex flex-col gap-x-6 gap-y-2 xl:flex-row xl:items-start',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface APIInfoProps extends HTMLAttributes<HTMLDivElement> {
  route: string;
  method?: string;
  badgeClassName?: string;
}

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
  badgeClassName,
  method = 'GET',
  ...props
}: APIInfoProps): React.ReactElement {
  return (
    <div className={cn('min-w-0 flex-1 prose-no-margin', className)} {...props}>
      <div
        className={cn(
          'sticky top-24 z-[2] flex flex-row items-center gap-2 rounded-lg border bg-fd-card p-3 md:top-10',
        )}
      >
        <span
          className={cn(
            badgeVariants({ color: getBadgeColor(method) }),
            badgeClassName,
          )}
        >
          {method}
        </span>
        <Route route={route} />

        <CopyRouteButton className="ms-auto size-6 p-1" route={route} />
      </div>

      {children}
    </div>
  );
}

interface PropertyProps {
  name: string;
  type: string;
  required: boolean;
  deprecated: boolean;
  children: ReactNode;
}

export function Property({
  name,
  type,
  required,
  deprecated,
  children,
}: PropertyProps): React.ReactElement {
  return (
    <div className="mb-4 flex flex-col rounded-lg border bg-fd-card p-3 prose-no-margin">
      <h4 className="inline-flex items-center gap-4">
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
      className={cn('sticky top-10 prose-no-margin xl:w-[400px]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ResponseTypes(props: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <Accordions
      type="single"
      className="!-m-4 border-none pt-2"
      defaultValue="Response"
    >
      {props.children}
    </Accordions>
  );
}

export function ExampleResponse(props: {
  children: ReactNode;
}): React.ReactElement {
  return <Accordion title="Response">{props.children}</Accordion>;
}

export function TypeScriptResponse(props: {
  children: ReactNode;
}): React.ReactElement {
  return <Accordion title="Typescript">{props.children}</Accordion>;
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

function CopyRouteButton({
  className,
  route,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  route: string;
}): React.ReactElement {
  const { baseUrl } = useApiContext();

  const [checked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(`${baseUrl ?? ''}${route}`);
  });

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          color: 'ghost',
          className,
        }),
      )}
      onClick={onCopy}
      {...props}
    >
      {checked ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}
