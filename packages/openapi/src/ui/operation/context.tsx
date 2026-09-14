'use client';
import {
  createContext,
  type ReactNode,
  use,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslations } from '@fuma-translate/react';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';
import { sample } from '@fumadocs/api-docs/schema/sample';
import { joinURL, resolveServerUrl } from '@fumadocs/api-docs/utils/url';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import type {
  HttpMethods,
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ResponseObject,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import type { RawRequestData, RequestData } from '@/requests/types';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
  type InlineCodeUsageGenerator,
  pathnameFromRequest,
} from '@/requests/generators';
import { isMediaTypeSupported } from '@/requests/media/adapter';
import { encodeRequestData } from '@/requests/media/encode';
import { getPreferredType, methodKeys } from '@/utils/schema';
import { getExampleRequests, type ExampleRequestItem } from '@/utils/get-example-requests';
import { ServerProvider, useOpenAPIContext, useServer } from '@/ui/contexts/api';

export type { RawRequestData };
export interface OperationParameters {
  in: 'path' | 'query' | 'header' | 'cookie';
  items: ParameterObject[];
}

export interface OperationSecurity {
  key: string;
  scopes: string[];
  /** `undefined` when the document doesn't define the scheme */
  scheme?: SecuritySchemeObject;
}

export interface OperationResponse {
  status: string;
  response: ResponseObject;
  /** media types of the response, resolved */
  content: Record<string, MediaTypeObject>;
}

export interface OperationCallback {
  name: string;
  path: string;
  method: HttpMethods;
  pathItem: PathItemObject;
  operation: OperationObject;
}

/** the operation and its resolved details, all read-only */
export interface OperationInfo {
  type: 'operation' | 'webhook';
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;

  title: string;
  description?: string;
  /** resolved request body with its media types, `undefined` when it has none */
  requestBody?: {
    description?: string;
    required?: boolean;
    content: Record<string, MediaTypeObject>;
  };
  /** resolved parameters grouped by location, empty groups omitted */
  parameters: OperationParameters[];
  /** alternative security requirements, always empty for webhooks */
  security: OperationSecurity[][];
  responses: OperationResponse[];
  /** callbacks flattened into webhook operations */
  callbacks: OperationCallback[];
}

export interface ExampleRequest {
  id: string;
  name: string;
  description?: string;
  data: RawRequestData;
  /** pathname of the request, with path parameters and query encoded */
  pathname: string;
}

export interface CodeUsageInfo {
  id: string;
  lang: string;
  label?: ReactNode;
}

export interface ResponseExample {
  /**
   * generated/defined example data
   */
  sample: unknown;

  label: ReactNode;

  /**
   * description (in Markdown)
   */
  description?: string;
}

export interface ResponseTab {
  /**
   * HTTP response code
   */
  code: string;

  response: ResponseObject;
  /**
   * media type of response
   */
  mediaType: string | null;

  examples?: ResponseExample[];
}

export interface OperationProviderProps {
  /** @defaultValue 'operation' */
  type?: 'operation' | 'webhook';
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;
  children: ReactNode;
}

interface ExampleItem extends ExampleRequestItem {
  pathname: string;
}

export interface OperationState {
  info: OperationInfo;
  parameters: ParameterObject[];
  codeUsages: CodeUsageGeneratorRegistry;
  examples: ExampleItem[];
  example: string | undefined;
  setExample: (id: string) => void;
  update: (data: RawRequestData, encoded?: RequestData) => void;
  subscribe: (listener: () => void) => () => void;
}

const OperationContext = createContext<OperationState | null>(null);
const parameterLocations = ['path', 'query', 'header', 'cookie'] as const;

export function OperationProvider({
  type = 'operation',
  path,
  method,
  operation,
  pathItem,
  children,
}: OperationProviderProps) {
  const runtime = useOpenAPIContext();
  const state = useMemo(() => {
    const { dereferenced, resolve } = runtime.document;

    const body = resolve(operation.requestBody);
    let requestBody: OperationInfo['requestBody'];
    if (body?.content && Object.keys(body.content).length > 0) {
      const content: Record<string, MediaTypeObject> = {};
      for (const [mediaType, item] of Object.entries(body.content)) {
        if (!isMediaTypeSupported(mediaType, runtime.mediaAdapters))
          throw new Error(`Media type ${mediaType} is not supported (in ${path})`);
        content[mediaType] = resolve(item);
      }
      requestBody = { description: body.description, required: body.required, content };
    }

    const resolvedParameters = [
      ...(operation.parameters ?? []),
      ...(pathItem.parameters ?? []),
    ].map((param) => resolve(param));
    const parameters: OperationParameters[] = [];
    for (const location of parameterLocations) {
      const items = resolvedParameters.filter((param) => param.in === location);
      if (items.length > 0) parameters.push({ in: location, items });
    }

    const security: OperationSecurity[][] = [];
    if (type === 'operation') {
      const schemes = dereferenced.components?.securitySchemes;
      for (const requirement of operation.security ?? dereferenced.security ?? []) {
        const entries = Object.entries(requirement);
        if (entries.length === 0) continue;
        security.push(
          entries.map(([key, scopes]) => ({ key, scopes, scheme: resolve(schemes?.[key]) })),
        );
      }
    }

    const responses: OperationResponse[] = [];
    for (const [status, item] of Object.entries(operation.responses ?? {})) {
      const response = resolve(item);
      const content: Record<string, MediaTypeObject> = {};
      for (const [mediaType, media] of Object.entries(response.content ?? {})) {
        content[mediaType] = resolve(media);
      }
      responses.push({ status, response, content });
    }

    const callbacks: OperationCallback[] = [];
    for (const [name, item] of Object.entries(operation.callbacks ?? {})) {
      for (const [callbackPath, rawPathItem] of Object.entries(resolve(item))) {
        const callback = resolve(rawPathItem);
        for (const callbackMethod of methodKeys) {
          const callbackOperation = callback[callbackMethod];
          if (!callbackOperation) continue;
          callbacks.push({
            name,
            path: callbackPath,
            method: callbackMethod,
            pathItem: callback,
            operation: callbackOperation,
          });
        }
      }
    }

    const codeUsages = createCodeUsageGeneratorRegistry(runtime.codeUsages);
    if (runtime.generateCodeSamples) {
      for (const gen of runtime.generateCodeSamples({ path, operation, method, pathItem })) {
        codeUsages.addInline(gen);
      }
    }
    for (const inline of operation['x-codeSamples'] ?? []) {
      codeUsages.addInline(inline as InlineCodeUsageGenerator);
    }

    const examples: ExampleItem[] = [];
    for (const item of getExampleRequests({
      path,
      method,
      operation,
      pathItem,
      mediaAdapters: runtime.mediaAdapters,
    })) {
      examples.push({ ...item, pathname: pathnameFromRequest(path, item.encoded) });
    }

    const info: OperationInfo = {
      type,
      path,
      method,
      operation,
      pathItem,
      title:
        operation.summary ||
        pathItem.summary ||
        (operation.operationId ? idToTitle(operation.operationId) : path),
      description: operation.description ?? pathItem.description,
      requestBody,
      parameters,
      security,
      responses,
      callbacks,
    };

    return { info, parameters: resolvedParameters, codeUsages, examples };
  }, [runtime, type, path, method, operation, pathItem]);
  const [example, setExample] = useState(
    () =>
      operation['x-exclusiveCodeSample'] ??
      operation['x-selectedCodeSample'] ??
      state.examples[0]?.id,
  );
  const listeners = useRef(new Set<() => void>());
  const value = useMemo<OperationState>(
    () => ({
      ...state,
      example,
      setExample(id) {
        if (state.examples.some((item) => item.id === id)) setExample(id);
      },
      update(data, encoded) {
        const item = state.examples.find((item) => item.id === example);
        if (!item) return;
        // persistent changes
        item.data = data;
        item.encoded = encoded ?? encodeRequestData(data, runtime.mediaAdapters, state.parameters);
        item.pathname = pathnameFromRequest(state.info.path, item.encoded);
        for (const listener of listeners.current) listener();
      },
      subscribe(listener) {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
    }),
    [state, example, runtime.mediaAdapters],
  );

  const content = <OperationContext value={value}>{children}</OperationContext>;
  const servers = operation.servers ?? pathItem.servers;
  if (!servers) return content;

  return <ServerProvider servers={servers as ServerObject[]}>{content}</ServerProvider>;
}

/** internal, use the hooks below */
export function useOperationState(): OperationState {
  const ctx = use(OperationContext);
  if (!ctx) throw new Error('Component must be used under <OperationProvider />');

  return ctx;
}

export function useOperation(): OperationInfo {
  return useOperationState().info;
}

/**
 * Example requests of the operation, and the selected one.
 */
export function useExampleRequests(): {
  items: ExampleRequest[];
  selected: string | undefined;
  select: (id: string) => void;
} {
  const { examples, example, setExample } = useOperationState();

  return { items: examples, selected: example, select: setExample };
}

function useSelectedExample(): ExampleItem | undefined {
  const { examples, example, subscribe } = useOperationState();
  const getSnapshot = () => examples.find((item) => item.id === example)?.encoded;
  const encoded = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return examples.find((item) => item.encoded === encoded);
}

/**
 * The selected example request, following updates from the playground.
 */
export function useExampleRequest(): {
  data: RawRequestData | undefined;
  update: (data: RawRequestData) => void;
} {
  const { update } = useOperationState();
  const item = useSelectedExample();

  return { data: item?.data, update };
}

/**
 * Code usage generators of the operation, including its inline code samples.
 */
export function useCodeUsages(): CodeUsageInfo[] {
  const { codeUsages } = useOperationState();

  return useMemo(() => {
    const out: CodeUsageInfo[] = [];
    for (const [id, item] of codeUsages.map()) {
      out.push({ id, lang: item.lang, label: item.label });
    }
    return out;
  }, [codeUsages]);
}

const noop = () => () => {};
/** `false` on the server and during hydration */
function useIsClient() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * Generate the code usage of the selected example request with the generator `id`.
 *
 * @returns `undefined` when the generator or the example is unavailable
 */
export function useCodeUsage(id: string): string | undefined {
  const { mediaAdapters } = useOpenAPIContext();
  const { codeUsages, info } = useOperationState();
  const { server } = useServer();
  const codegen = codeUsages.get(id);
  const data = useSelectedExample()?.encoded;
  const isClient = useIsClient();

  return useMemo(() => {
    if (!data || !codegen) return;
    const url = joinURL(
      server && isClient
        ? new URL(resolveServerUrl(server.url, server.variables), window.location.origin).href
        : 'https://example.com',
      pathnameFromRequest(info.path, data),
    );

    return codegen.generate(
      { ...data, url },
      {
        mediaAdapters,
        custom: null,
      },
    );
  }, [data, server, info.path, isClient, codegen, mediaAdapters]);
}

/**
 * Responses of the operation, with example values of their preferred media type.
 */
export function useResponseExamples(): ResponseTab[] {
  const { responses } = useOperation();
  const { resolve } = useOpenAPIContext().document;
  const t = useTranslations({ note: 'operation page' });

  return useMemo(() => {
    const tabs: ResponseTab[] = [];

    for (const { status: code, response, content } of responses) {
      const media = getPreferredType(content) ?? null;
      const responseOfType = media ? content[media] : null;
      const tab: ResponseTab = { code, response, mediaType: media };

      if (responseOfType?.examples) {
        tab.examples = [];

        for (const [key, item] of Object.entries(responseOfType.examples)) {
          const example = resolve(item);

          tab.examples.push({
            label:
              example?.summary ??
              t('Example {key}', {
                variables: { key },
              }),
            sample: getRaw(example.value),
            description: example?.description,
          });
        }
      } else if (responseOfType?.example || responseOfType?.schema) {
        tab.examples = [
          {
            label: t('Example'),
            sample: getRaw(responseOfType.example) ?? sample(responseOfType.schema as object),
          },
        ];
      }

      tabs.push(tab);
    }

    return tabs;
  }, [responses, resolve, t]);
}
