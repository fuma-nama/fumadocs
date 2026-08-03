'use client';
import { type DirectiveNode, getNamedType, type GraphQLType, print } from 'graphql';
import { resolveTypeLink, useRenderContext } from '../contexts/api';
import { cn } from '@/utils/cn';
import { useTranslations } from '@fuma-translate/react';
import { AtSignIcon } from 'lucide-react';
import { Fragment } from 'react/jsx-runtime';
import type { ComponentProps } from 'react';
import Link from 'fumadocs-core/link';

/**
 * A link to a reference, e.g. the docs page of a type or operation.
 */
export function ReferenceLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={cn('underline hover:text-fd-accent-foreground', className)} />;
}

/**
 * Render a type annotation like `[User!]!`, with the named type linked when `typeLinks` resolves it.
 */
export function TypeAnnotation({ type, className }: { type: GraphQLType; className?: string }) {
  const ctx = useRenderContext();
  const named = getNamedType(type);
  const annotation = String(type);
  const href = resolveTypeLink(ctx, named.name);
  const start = annotation.indexOf(named.name);

  return (
    <code className={cn('font-mono text-fd-muted-foreground', className)}>
      {annotation.slice(0, start)}
      {href ? <ReferenceLink href={href}>{named.name}</ReferenceLink> : named.name}
      {annotation.slice(start + named.name.length)}
    </code>
  );
}

export function DirectiveList({
  directives,
  className,
}: {
  directives: readonly DirectiveNode[];
  className?: string;
}) {
  const t = useTranslations({ note: 'directives list' });
  if (directives.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 not-prose bg-fd-card text-sm text-fd-card-foreground border p-2 shadow-md rounded-lg',
        className,
      )}
    >
      <p className="flex items-center gap-1.5 font-medium">
        <AtSignIcon className="text-fd-primary size-3.5" />
        {t('Directives')}
      </p>
      <div className="rounded-md border bg-fd-secondary text-fd-secondary-foreground divide-y divide-fd-border">
        {directives.map((directive, i) => (
          <div key={i} className="p-2">
            <p className="font-mono font-medium">{directive.name.value}</p>
            {directive.arguments && directive.arguments.length > 0 && (
              <div className="grid grid-cols-[auto_1fr] gap-2 mt-2 text-xs">
                {directive.arguments.map((arg, j) => (
                  <Fragment key={j}>
                    <code>{arg.name.value}</code>
                    <code className="text-fd-muted-foreground">{print(arg.value)}</code>
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
