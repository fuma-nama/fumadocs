'use client';
import { type DirectiveNode, getNamedType, type GraphQLType, print } from 'graphql';
import { useRenderContext } from '../contexts/api';
import { cn } from '@/utils/cn';

/**
 * Render a type annotation like `[User!]!`, with the named type linked when `typeLinks` resolves it.
 */
export function TypeAnnotation({ type, className }: { type: GraphQLType; className?: string }) {
  const ctx = useRenderContext();
  const named = getNamedType(type);
  const annotation = String(type);
  const href = ctx.typeLinks?.(named.name, ctx);
  const start = annotation.indexOf(named.name);

  return (
    <code className={cn('font-mono text-fd-muted-foreground', className)}>
      {annotation.slice(0, start)}
      {href ? (
        <a href={href} className="underline hover:text-fd-accent-foreground">
          {named.name}
        </a>
      ) : (
        named.name
      )}
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
  if (directives.length === 0) return null;

  return (
    <div className={cn('flex flex-row flex-wrap gap-1.5 not-prose', className)}>
      {directives.map((directive, i) => (
        <code
          key={i}
          className="text-xs font-mono px-2.5 py-1 rounded-full border bg-fd-secondary text-fd-secondary-foreground shadow-sm"
        >
          {print(directive)}
        </code>
      ))}
    </div>
  );
}
