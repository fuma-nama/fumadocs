'use client';
import type { ComponentProps, CSSProperties } from 'react';
import { useAnchorId } from 'shared-api/auto-anchor';
import { useOperation } from '@/operation';
import { cn } from '@/utils/cn';
import { KindLabel } from '../components/badge';
import { DirectiveRow } from '../components/directive';
import { TypeAnnotation } from '../components/type-annotation';

// each argument takes a line of its own when the one-line signature doesn't fit (the "Fab Four" technique)
const argumentClassName =
  'basis-[calc((var(--signature)-100%)*999)] ps-[clamp(0px,calc((var(--signature)-100%)*999),2ch)]';

/**
 * The signature of operation, like `QUERY customer(id: ID!): Customer`, actions like the playground trigger go in `children`.
 */
export function OperationBar({ children, className, ...props }: ComponentProps<'div'>) {
  const { kind, field, directives } = useOperation();
  const { args } = field;
  const returns = useAnchorId(['returns']);
  // the root of the arguments card, its rows are `${id}.${name}`
  const argumentsId = useAnchorId(['arguments', 'arguments']);
  // the width of one-line signature, the names of arguments are padded
  let length = field.name.length + String(field.type).length + 2;
  for (const arg of args) length += arg.name.length + String(arg.type).length + 4;

  return (
    <div
      {...props}
      className={cn(
        'not-prose @container rounded-xl border bg-fd-card text-sm text-fd-card-foreground',
        className,
      )}
    >
      <div className="flex min-h-11 flex-wrap items-start gap-x-3 p-1.5 ps-3.5">
        <KindLabel className="text-xs leading-8">{kind}</KindLabel>
        <code
          style={{ '--signature': `calc(${length}ch + ${args.length / 2}rem)` } as CSSProperties}
          className={cn(
            'flex min-w-0 flex-1 flex-wrap overflow-x-auto py-1.5 text-[0.8125rem] leading-5 whitespace-pre [scrollbar-width:none]',
            // narrow bars give the signature its own line under the actions
            children && '@max-lg:order-last @max-lg:basis-full @max-lg:pt-0 @max-lg:pb-1',
          )}
        >
          <span>
            <span className={field.deprecationReason != null ? 'line-through' : undefined}>
              {field.name}
            </span>
            {args.length > 0 && <span className="text-fd-muted-foreground">(</span>}
          </span>
          {args.map((arg, i) => (
            <span key={arg.name} className={argumentClassName}>
              <a href={`#${argumentsId}.${arg.name}`} className="group/argument">
                <span
                  className={cn(
                    'rounded-md bg-fd-primary/10 px-1 text-fd-primary transition-colors group-hover/argument:bg-fd-primary/20',
                    arg.deprecationReason != null && 'line-through',
                  )}
                >
                  {arg.name}
                </span>
                <span className="text-fd-muted-foreground transition-colors group-hover/argument:text-fd-accent-foreground">
                  : {String(arg.type)}
                </span>
              </a>
              {i < args.length - 1 && <span className="text-fd-muted-foreground">, </span>}
            </span>
          ))}
          <span className="text-fd-muted-foreground">
            {args.length > 0 && ')'}: <TypeAnnotation type={field.type} href={`#${returns}`} />
          </span>
        </code>
        {children && <div className="ms-auto flex h-8 shrink-0 items-center">{children}</div>}
      </div>
      <DirectiveRow directives={directives} />
    </div>
  );
}
