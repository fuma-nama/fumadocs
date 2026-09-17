'use client';
import {
  type ComponentProps,
  createContext,
  type FC,
  type ReactNode,
  use,
  useCallback,
  useMemo,
} from 'react';
import type { SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { AsyncAPIObject, ServerObject } from '@/types';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { getDefaultValues } from '@/utils/server-url';
import { useServerStore } from '@fumadocs/api-docs/utils/use-server-store';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components the UI renders through, so a page can replace them */
export interface AsyncAPIComponents {
  SchemaUI: FC<Omit<SchemaUIOptions, 'resolver' | 'renderMarkdown' | 'renderCodeblock'>>;
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

export interface SelectedServer {
  id: string;
  variables: Record<string, string>;
}

interface ServerContextType {
  servers: Record<string, ServerObject>;
  server: SelectedServer | null;
  setServer: (serverId: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

const AsyncAPIContext = createContext<AsyncAPIRuntime | null>(null);
const ComponentsContext = createContext<AsyncAPIComponents | null>(null);
const ServerContext = createContext<ServerContextType | null>(null);

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

export function useServer(): ServerContextType {
  const ctx = use(ServerContext);
  if (!ctx) throw new Error('Component must be used under <AsyncAPIProvider />');

  return ctx;
}

/**
 * Get the `localStorage` key of `name`, with the prefix of the page.
 */
export function useStorageKey(): (name: string) => string {
  const { storageKeyPrefix } = useAsyncAPI();

  return useCallback((name) => storageKeyPrefix + name, [storageKeyPrefix]);
}

const keyOfServer = (server: SelectedServer) => server.id;

export function ServerProvider({
  servers,
  children,
}: {
  servers: Record<string, ServerObject>;
  children: ReactNode;
}) {
  const storageKey = useStorageKey()('server-url');
  const resolve = useCallback(
    (id: string): SelectedServer | null => {
      const server = servers[id];
      if (!server) return null;

      return { id, variables: getDefaultValues(server) };
    },
    [servers],
  );
  const store = useServerStore({
    storageKey,
    keyOf: keyOfServer,
    resolve,
    defaultKey: Object.keys(servers)[0],
  });

  return (
    <ServerContext value={useMemo(() => ({ servers, ...store }), [servers, store])}>
      {children}
    </ServerContext>
  );
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
        <ServerProvider servers={servers}>{children}</ServerProvider>
      </ComponentsContext>
    </AsyncAPIContext>
  );
}
