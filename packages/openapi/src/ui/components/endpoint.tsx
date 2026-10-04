import type { ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { MethodLabel } from './method-label';

export function EndpointBar({
  method,
  route,
  deprecated = false,
  children,
  ...props
}: ComponentProps<'div'> & { method: string; route: string; deprecated?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        'not-prose flex min-h-11 items-center gap-3 rounded-xl border bg-fd-card p-1.5 ps-3.5 text-sm text-fd-card-foreground',
        props.className,
      )}
    >
      <MethodLabel className="text-xs">{method}</MethodLabel>
      <Route route={route} className={cn('flex-1', deprecated && 'line-through')} />
      {children}
    </div>
  );
}

function Route({ route, ...props }: ComponentProps<'div'> & { route: string }) {
  return (
    <div
      {...props}
      className={cn(
        'flex min-w-0 items-center overflow-x-auto font-mono text-[0.8125rem] text-nowrap [scrollbar-width:none]',
        props.className,
      )}
    >
      {/* variables, including runtime expressions like `{$request.body#/url}`, and slashes between texts */}
      {route.split(/(\{[^}]*\}|\/)/).map((part, index) => {
        if (index % 2 === 0) return part;
        if (part === '/')
          return (
            <span key={index} className="text-fd-muted-foreground">
              /
            </span>
          );

        return (
          <span key={index} className="rounded-md bg-fd-primary/10 px-1 text-fd-primary">
            {part}
          </span>
        );
      })}
    </div>
  );
}
