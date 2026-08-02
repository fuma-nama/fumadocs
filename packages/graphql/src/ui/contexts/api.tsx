'use client';
import { createContext, type ReactNode, use } from 'react';
import type { RenderContext } from '@/types';

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
