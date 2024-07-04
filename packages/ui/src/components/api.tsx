'use client';

import React, {
  ButtonHTMLAttributes,
  Fragment,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tab, Tabs } from '@/components/tabs';
import { Accordion, Accordions } from '@/components/accordion';
import { buttonVariants } from '@/theme/variants';
import { useCopyButton } from '@/utils/use-copy-button';
import { useApiContext } from '@/contexts/api';

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
  route: string;
  method?: string;
  badgeClassName?: string;
}

const badgeVariants = cva(
  'rounded border px-1.5 py-1 text-xs font-medium leading-[12px]',
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
  route,
  badgeClassName,
  method = 'GET',
  ...props
}: APIInfoProps): React.ReactElement {
  const { baseUrl } = useApiContext();

  let color: VariantProps<typeof badgeVariants>['color'] = 'green';
  if (['GET', 'HEAD'].includes(method)) color = 'green';
  if (['PUT'].includes(method)) color = 'yellow';
  if (['PATCH'].includes(method)) color = 'orange';
  if (['POST'].includes(method)) color = 'blue';
  if (['DELETE'].includes(method)) color = 'red';

  const renderRoute = (): ReactNode => {
    const routeFragments = route.split('/').filter((part) => part !== '');

    return routeFragments.map((part, index, array) => (
      <Fragment key={`${route}-part-${String(index)}`}>
        {index === 0 && <div className="text-gray-400">/</div>}
        <div className="text-foreground">{part}</div>
        {index < array.length - 1 && <div className="text-gray-400">/</div>}
      </Fragment>
    ));
  };

  const onCopy = (): void => {
    const textContent = baseUrl + route;
    void navigator.clipboard.writeText(textContent);
  };

  const [checked, onClick] = useCopyButton(onCopy);

  if (children) {
    return (
      <div
        className={cn('min-w-0 flex-1 prose-no-margin', className)}
        {...props}
      >
        <div
          className={cn(
            'group flex w-full items-center justify-between rounded-lg border bg-card p-3 text-base',
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(badgeVariants({ color }), badgeClassName)}>
              {method}
            </span>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-1 font-mono text-sm">
              {renderRoute()}
            </div>
          </div>

          <InteractiveButton
            className="size-6 p-1"
            checked={checked}
            onClick={onClick}
          >
            <CheckIcon
              className={cn(
                'size-3 transition-transform',
                !checked && 'scale-0',
              )}
            />
            <CopyIcon
              className={cn(
                'absolute size-3 transition-transform',
                checked && 'scale-0',
              )}
            />
          </InteractiveButton>
        </div>

        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex w-full items-center justify-between rounded-lg border bg-card p-3 text-base',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn(badgeVariants({ color }), badgeClassName)}>
          {method}
        </span>
        <div className="h-4 w-px bg-muted" />
        <div className="flex items-center gap-1 font-mono text-sm">
          {renderRoute()}
        </div>
      </div>

      <InteractiveButton
        className="size-6 p-1"
        checked={checked}
        onClick={onClick}
      >
        <CheckIcon
          className={cn('size-3 transition-transform', !checked && 'scale-0')}
        />
        <CopyIcon
          className={cn(
            'absolute size-3 transition-transform',
            checked && 'scale-0',
          )}
        />
      </InteractiveButton>
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
  children: ReactNode;
}): React.ReactElement {
  return (
    <Accordions type="single">
      <Accordion title="Object Type">{props.children}</Accordion>
    </Accordions>
  );
}

export interface InteractiveButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
}

export function InteractiveButton({
  className,
  checked = true,
  children,
  ...props
}: InteractiveButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          color: 'ghost',
          className: 'transition-all group-hover:opacity-100',
        }),
        !checked && 'opacity-0',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const sendButtonVariants = cva(
  'rounded-lg font-medium text-white transition-colors',
  {
    variants: {
      color: {
        green: 'bg-green-500 hover:bg-green-600 disabled:bg-green-600',
        yellow: 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-600',
        red: 'bg-red-500 hover:bg-red-600 disabled:bg-red-600',
        blue: 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-600',
        orange: 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-600',
        purple: 'bg-purple-500 hover:bg-purple-600 disabled:bg-purple-600',
      },
    },
  },
);

export function SendButton({
  children,
  className,
  disabled,
  method,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  method: string;
}): React.ReactElement {
  let color: VariantProps<typeof sendButtonVariants>['color'] = 'green';

  if (['GET', 'HEAD'].includes(method)) color = 'green';
  if (['PUT'].includes(method)) color = 'yellow';
  if (['PATCH'].includes(method)) color = 'orange';
  if (['POST'].includes(method)) color = 'blue';
  if (['DELETE'].includes(method)) color = 'red';

  return (
    <button
      disabled={disabled}
      type="submit"
      className={cn(sendButtonVariants({ color }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
