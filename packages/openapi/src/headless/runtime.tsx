'use client';
import {
  type ComponentProps,
  createContext,
  type FC,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  Awaitable,
  Document,
  HttpMethods,
  OperationObject,
  PathItemObject,
  ServerObject,
} from '@/types';
import type { OperationItem, WebhookItem } from '@/utils/pages/builder';
import type { DereferencedDocument } from '@/utils/document/dereference';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { CodeUsageGeneratorRegistry, InlineCodeUsageGenerator } from '@/requests/generators';
import type { ParsedSchema } from '@/utils/schema';
import type { SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useStorageKey } from '@/utils/storage-key';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components the UI renders through, so a page can replace them */
export interface OpenAPIComponents {
  SchemaUI: FC<Omit<SchemaUIOptions, 'renderMarkdown' | 'renderCodeblock'>>;
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

export interface GenerateTypeScriptDefinitionsContext {
  name: string;
  readOnly: boolean;
  writeOnly: boolean;
  doc: DereferencedDocument;
}

export interface OpenAPIRuntime {
  doc: DereferencedDocument;
  /**
   * Support other media types.
   */
  mediaAdapters: Record<string, MediaAdapter>;
  proxyUrl?: string;
  /**
   * Set a prefix for `localStorage` keys.
   *
   * Useful when using multiple OpenAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-openapi-`
   */
  storageKeyPrefix?: string;
  /**
   * Generate example code usage for all endpoints.
   */
  codeUsages?: CodeUsageGeneratorRegistry;
  /**
   * Generate example code usage for each endpoint.
   */
  generateCodeSamples?: (options: {
    path: string;
    operation: OperationObject;
    method: HttpMethods;
    pathItem: PathItemObject;
  }) => InlineCodeUsageGenerator[];
  /**
   * Generate TypeScript definitions from JSON schema.
   *
   * Pass `false` to disable it.
   */
  generateTypeScriptDefinitions?:
    | ((
        schema: ParsedSchema,
        ctx: GenerateTypeScriptDefinitionsContext,
      ) => Awaitable<string | undefined>)
    | false;
}

export interface OpenAPIProviderProps extends Partial<Omit<OpenAPIRuntime, 'doc'>> {
  /** the bundled OpenAPI document */
  document: Document;
  components: OpenAPIComponents;
  children: ReactNode;
}

/** props of the component rendering an operation or webhook of a page */
export interface PageOperationProps {
  type: 'operation' | 'webhook';
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;
  showTitle?: boolean;
  showDescription?: boolean;
}

export interface PageLayoutProps {
  operations?: { item: OperationItem; children: ReactNode }[];
  webhooks?: { item: WebhookItem; children: ReactNode }[];
}

export interface CreateOpenAPIPageOptions extends Omit<
  OpenAPIProviderProps,
  'document' | 'proxyUrl' | 'components' | 'children'
> {
  components: OpenAPIComponents & {
    /** renders an operation or webhook of the page */
    Operation: FC<PageOperationProps>;
    /** wraps the rendered operations and webhooks */
    Layout?: FC<PageLayoutProps>;
  };
}

interface ServerContextType {
  servers?: ServerObject[];
  server: SelectedServer | null;
  setServer: (value: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

export interface SelectedServer {
  url: string;
  name?: string;
  variables: Record<string, string>;
}

export const OpenAPIContext = createContext<OpenAPIRuntime | null>(null);
export const ComponentsContext = createContext<OpenAPIComponents | null>(null);
const ServerContext = createContext<ServerContextType | null>(null);

/**
 * The runtime of the API page: the document and request options.
 */
export function useOpenAPI(): OpenAPIRuntime {
  const ctx = use(OpenAPIContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');

  return ctx;
}

export function useComponents(): OpenAPIComponents {
  const components = use(ComponentsContext);
  if (!components) throw new Error('Component must be used under <OpenAPIProvider />');

  return components;
}

export function useServer(): ServerContextType {
  const ctx = use(ServerContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');

  return ctx;
}

/**
 * Generate TypeScript definitions of a JSON schema, `undefined` when disabled.
 */
export function useTypeScriptDefinitions(
  schema: ParsedSchema | undefined,
  options: Pick<GenerateTypeScriptDefinitionsContext, 'name' | 'readOnly' | 'writeOnly'>,
): string | undefined {
  const runtime = useOpenAPI();
  const { name, readOnly, writeOnly } = options;
  const result = useMemo(() => {
    if (!schema || !runtime.generateTypeScriptDefinitions) return;
    return runtime.generateTypeScriptDefinitions(schema, {
      name,
      readOnly,
      writeOnly,
      doc: runtime.doc,
    });
  }, [runtime, schema, name, readOnly, writeOnly]);

  // assume it is on server component when returned async
  return result instanceof Promise ? use(result) : result;
}

export function ServerProvider({
  servers,
  children,
}: {
  servers?: ServerObject[];
  children: ReactNode;
}) {
  const storageKey = useStorageKey()('server-url');
  const [server, setServer] = useState<SelectedServer | null>(() => {
    if (!servers || servers.length === 0) return null;
    const defaultItem = servers[0];

    return {
      name: defaultItem.name,
      url: defaultItem.url!,
      variables: getDefaultValues(defaultItem),
    };
  });

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (!cached) return;

    try {
      const obj = JSON.parse(cached) as Partial<SelectedServer> | null;
      if (
        servers?.some((item) => item.url === obj?.url) &&
        typeof obj?.variables === 'object' &&
        obj.variables !== null
      ) {
        setServer(obj as SelectedServer);
      }
    } catch {
      // ignore
    }
  }, [servers, storageKey]);

  return (
    <ServerContext
      value={useMemo(
        () => ({
          servers,
          server,
          setServerVariables(variables) {
            setServer((prev) => {
              if (!prev) return null;

              const updated = { ...prev, variables };
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          },
          setServer(value) {
            const obj = servers?.find((item) => item.url === value);
            if (!obj) return;

            const result: SelectedServer = {
              name: obj.name,
              url: value,
              variables: getDefaultValues(obj),
            };

            localStorage.setItem(storageKey, JSON.stringify(result));
            setServer(result);
          },
        }),
        [server, servers, storageKey],
      )}
    >
      {children}
    </ServerContext>
  );
}

function getDefaultValues(server: ServerObject): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    if (v.default !== undefined) out[k] = String(v.default);
  }

  return out;
}
