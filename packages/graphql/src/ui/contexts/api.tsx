'use client';
import { createContext, type ReactNode, use } from 'react';
import type { RenderContext } from '@/types';
import type { OperationKind } from '@/utils/schema';

const Context = createContext<RenderContext | null>(null);

export function useRenderContext(): RenderContext {
  const ctx = use(Context);
  if (!ctx) throw new Error('Component must be used under <RenderContextProvider />');

  return ctx;
}

export function RenderContextProvider({
  children,
  ctx,
}: {
  ctx: RenderContext;
  children: ReactNode;
}) {
  return <Context value={ctx}>{children}</Context>;
}

/**
 * Resolve the page URL of a named type, from the `typeLinks` option or pre-generated links.
 */
export function resolveTypeLink(ctx: RenderContext, name: string): string | undefined {
  return ctx.typeLinks?.(name, ctx) ?? ctx.schema.links?.types[name];
}

/**
 * Resolve the page URL of an operation, from the `operationLinks` option or pre-generated links.
 */
export function resolveOperationLink(
  ctx: RenderContext,
  kind: OperationKind,
  name: string,
): string | undefined {
  return ctx.operationLinks?.(kind, name, ctx) ?? ctx.schema.links?.operations[`${kind}:${name}`];
}
