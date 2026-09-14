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
  HttpMethods,
  OperationObject,
  PathItemObject,
  ServerObject,
} from '@/types';
import type { DereferencedDocument } from '@/utils/document/dereference';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { CodeUsageGeneratorRegistry, InlineCodeUsageGenerator } from '@/requests/generators';
import type { ParsedSchema } from '@/utils/schema';
import type { SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';

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
  document: DereferencedDocument;
}

export interface OpenAPIRuntime {
  document: DereferencedDocument;
  mediaAdapters: Record<string, MediaAdapter>;
  proxyUrl?: string;
  storageKeyPrefix?: string;
}

/** the full runtime, only the `OpenAPIRuntime` part is public */
export interface OpenAPIContextType extends OpenAPIRuntime {
  codeUsages: CodeUsageGeneratorRegistry;
  generateCodeSamples?: (options: {
    path: string;
    operation: OperationObject;
    method: HttpMethods;
    pathItem: PathItemObject;
  }) => InlineCodeUsageGenerator[];
  generateTypeScriptDefinitions:
    | ((
        schema: ParsedSchema,
        ctx: GenerateTypeScriptDefinitionsContext,
      ) => Awaitable<string | undefined>)
    | false;
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

const OpenAPIContext = createContext<OpenAPIContextType | null>(null);
const ComponentsContext = createContext<OpenAPIComponents | null>(null);
const ServerContext = createContext<ServerContextType | null>(null);

export function useOpenAPIContext(): OpenAPIContextType {
  const ctx = use(OpenAPIContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');

  return ctx;
}

/**
 * The runtime of the API page: the document and request options.
 */
export function useOpenAPI(): OpenAPIRuntime {
  return useOpenAPIContext();
}

export function useComponents(): OpenAPIComponents {
  const components = use(ComponentsContext);
  if (!components) throw new Error('Component must be used under <OpenAPIProvider />');

  return components;
}

export function useServer(): ServerContextType {
  const ctx = use(ServerContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

/**
 * Generate TypeScript definitions of a JSON schema, `undefined` when disabled.
 */
export function useTypeScriptDefinitions(
  schema: ParsedSchema | undefined,
  options: Pick<GenerateTypeScriptDefinitionsContext, 'name' | 'readOnly' | 'writeOnly'>,
): string | undefined {
  const runtime = useOpenAPIContext();
  const { name, readOnly, writeOnly } = options;
  const result = useMemo(() => {
    if (!schema || !runtime.generateTypeScriptDefinitions) return;
    return runtime.generateTypeScriptDefinitions(schema, {
      name,
      readOnly,
      writeOnly,
      document: runtime.document,
    });
  }, [runtime, schema, name, readOnly, writeOnly]);

  // assume it is on server component when returned async
  return result instanceof Promise ? use(result) : result;
}

export function OpenAPIContextProvider({
  runtime,
  components,
  children,
}: {
  runtime: OpenAPIContextType;
  components: OpenAPIComponents;
  children: ReactNode;
}) {
  return (
    <OpenAPIContext value={runtime}>
      <ComponentsContext value={components}>{children}</ComponentsContext>
    </OpenAPIContext>
  );
}

export function ServerProvider({
  servers,
  children,
}: {
  servers?: ServerObject[];
  children: ReactNode;
}) {
  const { storageKeyPrefix } = useOpenAPI();
  const storageKey = `${storageKeyPrefix ?? 'fumadocs-openapi-'}server-url`;
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
      const obj: unknown = JSON.parse(cached);
      if (
        typeof obj === 'object' &&
        obj !== null &&
        'url' in obj &&
        typeof obj.url === 'string' &&
        'variables' in obj &&
        typeof obj.variables === 'object' &&
        obj.variables !== null
      ) {
        setServer(obj as SelectedServer);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

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
