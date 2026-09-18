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
import type { JsonSchema } from '@fumadocs/json-schema';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import { useServerStore } from 'shared-api/utils/use-server-store';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { CreatePageComponentsOptions as PageComponentsOptions } from 'shared-api/components/defaults';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components the UI renders through, so a page can replace them */
export interface OpenAPIComponents {
  SchemaUI: FC<SchemaUIOptions>;
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
  storageKeyPrefix: string;
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
        schema: JsonSchema,
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
  /** the Shiki highlighter of code blocks, without it they render unhighlighted */
  shiki?: ShikiFactory;
  shikiOptions?: PageComponentsOptions['shikiOptions'];
  components: Pick<OpenAPIComponents, 'SchemaUI'> &
    Partial<Omit<OpenAPIComponents, 'SchemaUI'>> & {
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
  schema: JsonSchema | undefined,
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

const keyOfServer = (server: SelectedServer) => server.url;

export function ServerProvider({
  servers,
  children,
}: {
  servers?: ServerObject[];
  children: ReactNode;
}) {
  const storageKey = `${useOpenAPI().storageKeyPrefix}server-url`;
  const resolve = useCallback(
    (url: string): SelectedServer | null => {
      const server = servers?.find((item) => item.url === url);
      if (!server) return null;

      return { name: server.name, url, variables: getDefaultValues(server) };
    },
    [servers],
  );
  const store = useServerStore({
    storageKey,
    keyOf: keyOfServer,
    resolve,
    defaultKey: servers?.[0]?.url,
  });

  return (
    <ServerContext value={useMemo(() => ({ servers, ...store }), [servers, store])}>
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
