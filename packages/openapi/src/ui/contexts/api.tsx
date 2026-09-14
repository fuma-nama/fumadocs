'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import type { RenderContext } from '@/types';
import {
  type OpenAPIComponents,
  type OpenAPIContextType,
  OpenAPIContextProvider,
  useServer,
} from '@/headless/runtime';

const Context = createContext<RenderContext | null>(null);

/** @deprecated use the hooks of `fumadocs-openapi/headless`, unavailable under `<OpenAPIProvider />` */
export function useRenderContext(): RenderContext {
  const ctx = use(Context);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

/** @deprecated use `useServer()` from `fumadocs-openapi/headless` */
export const useServerContext = useServer;

/** the built-in page keeps the deprecated `useRenderContext()` available */
export function RenderContextProvider({
  ctx,
  components,
  children,
}: {
  ctx: RenderContext;
  components: OpenAPIComponents;
  children: ReactNode;
}) {
  const runtime = useMemo<OpenAPIContextType>(() => {
    const generate = ctx.generateTypeScriptDefinitions;

    return {
      document: ctx.schema,
      mediaAdapters: ctx.mediaAdapters,
      proxyUrl: ctx.proxyUrl,
      storageKeyPrefix: ctx.storageKeyPrefix,
      codeUsages: ctx.codeUsages,
      generateCodeSamples: ctx.generateCodeSamples,
      // the deprecated `ctx` of `generateTypeScriptDefinitions` only exists on the built-in page
      generateTypeScriptDefinitions:
        generate && ((schema, context) => generate(schema, { ...context, ctx })),
    };
  }, [ctx]);

  return (
    <Context value={ctx}>
      <OpenAPIContextProvider runtime={runtime} components={components}>
        {children}
      </OpenAPIContextProvider>
    </Context>
  );
}
