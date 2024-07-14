// TODO: Remove this (next major)
'use client';
import { type HTMLAttributes, type ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Tab, Tabs } from '@/components/tabs';
import { Accordion, Accordions } from '@/components/accordion';

export function Root({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col gap-24 text-sm text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
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
  method?: string;
  route: string;
}

const badgeVariants = cva(
  'rounded-lg border px-1.5 py-1 text-xs font-medium leading-[12px]',
  {
    variants: {
      color: {
        green:
          'border-green-400/50 bg-green-400/20 text-green-600 dark:text-green-400',
        yellow:
          'border-yellow-400/50 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
        red: 'border-red-400/50 bg-red-400/20 text-red-600 dark:text-red-400',
        blue: 'border-blue-400/50 bg-blue-400/20 text-blue-600 dark:text-blue-400',
        orange:
          'border-orange-400/50 bg-orange-400/20 text-orange-600 dark:text-orange-400',
      },
    },
  },
);

export function APIInfo({
  children,
  className,
  method = 'GET',
  route,
  ...props
}: APIInfoProps): React.ReactElement {
  let color: VariantProps<typeof badgeVariants>['color'] = 'green';
  if (['GET', 'HEAD'].includes(method)) color = 'green';
  if (['PUT'].includes(method)) color = 'yellow';
  if (['PATCH'].includes(method)) color = 'orange';
  if (['POST'].includes(method)) color = 'blue';
  if (['DELETE'].includes(method)) color = 'red';

  return (
    <div className={cn('flex-1 prose-no-margin', className)} {...props}>
      <h2 className="flex flex-row items-center gap-3 rounded-lg border bg-card p-3 text-base">
        <span className={cn(badgeVariants({ color }))}>{method}</span>
        <code>{route}</code>
      </h2>
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
    <div className="mb-4 flex flex-col rounded-lg border bg-card p-3 prose-no-margin">
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
        <span className="ms-auto font-mono text-[13px] text-muted-foreground">
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
      className={cn('sticky top-6 prose-no-margin xl:w-[400px]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const Responses = Tabs;
export const Response = Tab;

export const Requests = Tabs;
export const Request = Tab;

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
