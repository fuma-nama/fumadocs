'use client';
import { type ComponentProps, createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { AsyncAPIObject, ServerObject } from '@/types';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { ServerProvider } from './server';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components the UI renders through, so a page can replace them */
export interface AsyncAPIComponents {
  SchemaUI: FC<Omit<SchemaUIOptions, 'resolver'>>;
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

export interface AsyncAPIRuntime {
  doc: DereferencedDocument;
  /**
   * Prefix of `localStorage` keys.
   *
   * Useful when using multiple AsyncAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-asyncapi-`
   */
  storageKeyPrefix: string;
}

export interface AsyncAPIProviderProps extends Partial<Omit<AsyncAPIRuntime, 'doc'>> {
  /** the bundled AsyncAPI document */
  document: AsyncAPIObject;
  components: AsyncAPIComponents;
  children: ReactNode;
}

/** props of the component rendering an operation of a page */
export interface PageOperationProps {
  id: string;
  action: 'send' | 'receive';
  showTitle?: boolean;
  showDescription?: boolean;
}

const AsyncAPIContext = createContext<AsyncAPIRuntime | null>(null);
const ComponentsContext = createContext<AsyncAPIComponents | null>(null);

/**
 * The runtime of the API page: the document and its options.
 */
export function useAsyncAPI(): AsyncAPIRuntime {
  const ctx = use(AsyncAPIContext);
  if (!ctx) throw new Error('Component must be used under <AsyncAPIProvider />');

  return ctx;
}

export function useComponents(): AsyncAPIComponents {
  const components = use(ComponentsContext);
  if (!components) throw new Error('Component must be used under <AsyncAPIProvider />');

  return components;
}

/**
 * The runtime of an API page, for UIs built from the headless hooks.
 */
export function AsyncAPIProvider({
  document,
  storageKeyPrefix = 'fumadocs-asyncapi-',
  components,
  children,
}: AsyncAPIProviderProps) {
  const runtime = useMemo<AsyncAPIRuntime>(
    () => ({ doc: dereferenceBundledDocument(document), storageKeyPrefix }),
    [document, storageKeyPrefix],
  );

  const servers = useMemo(() => {
    const { dereferenced, resolve } = runtime.doc;
    const out: Record<string, ServerObject> = {};
    for (const [k, v] of Object.entries(dereferenced.servers ?? {})) out[k] = resolve(v);

    return out;
  }, [runtime]);

  return (
    <AsyncAPIContext value={runtime}>
      <ComponentsContext value={components}>
        <ServerProvider servers={servers} storageKeyPrefix={storageKeyPrefix}>
          {children}
        </ServerProvider>
      </ComponentsContext>
    </AsyncAPIContext>
  );
}
