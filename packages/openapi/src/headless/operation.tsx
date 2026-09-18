'use client';
import { createContext, type ReactNode, use, useMemo, useSyncExternalStore } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { idToTitle } from 'shared-api/utils/id-to-title';
import { sample } from '@fumadocs/json-schema';
import { joinURL, resolveServerUrl } from 'shared-api/utils/url';
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
import { getExampleRequests } from '@/utils/get-example-requests';
import { ServerProvider, useOpenAPI, useServer } from './runtime';

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
  /** code usage generators, including the inline code samples of operation */
  codeUsages: CodeUsageGeneratorRegistry;
}

export interface ExampleRequest {
  id: string;
  name: string;
  description?: string;
  data: RawRequestData;
  encoded: RequestData;
  /** pathname of the request, with path parameters and query encoded */
  pathname: string;
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

type ExampleListener = (item: ExampleRequest) => void;

interface OperationState {
  info: OperationInfo;
  parameters: ParameterObject[];
  examples: ExampleRequest[];
  /** the selected example, subscribe to follow its changes */
  getExample: () => string | undefined;
  setExample: (id: string) => void;
  update: (data: RawRequestData, encoded?: RequestData) => void;
  /** listeners are called on selection and updates */
  subscribe: (listener: ExampleListener) => () => void;
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
  const runtime = useOpenAPI();
  const state = useMemo<OperationState>(() => {
    const { dereferenced, resolve } = runtime.doc;

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

    // operation parameters override the path item's
    const resolvedParameters: ParameterObject[] = [];
    const groups: Record<string, ParameterObject[]> = {};
    const keys = new Set<string>();
    for (const list of [operation.parameters, pathItem.parameters]) {
      for (const item of list ?? []) {
        const param = resolve(item);
        const key = `${param.in}:${param.name}`;
        if (keys.has(key)) continue;

        keys.add(key);
        resolvedParameters.push(param);
        (groups[param.in!] ??= []).push(param);
      }
    }
    const parameters: OperationParameters[] = [];
    for (const location of parameterLocations) {
      const items = groups[location];
      if (items) parameters.push({ in: location, items });
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
    if (type === 'operation') {
      for (const gen of runtime.generateCodeSamples?.({ path, operation, method, pathItem }) ??
        []) {
        codeUsages.addInline(gen);
      }
      for (const inline of operation['x-codeSamples'] ?? []) {
        codeUsages.addInline(inline as InlineCodeUsageGenerator);
      }
    }

    const examples = getExampleRequests({
      path,
      method,
      operation,
      parameters: resolvedParameters,
      mediaAdapters: runtime.mediaAdapters,
    }) as ExampleRequest[];
    for (const item of examples) {
      item.pathname = pathnameFromRequest(path, item.encoded);
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
      codeUsages,
    };

    return {
      info,
      parameters: resolvedParameters,
      examples,
      ...createExampleStore(
        examples,
        operation['x-exclusiveCodeSample'] ?? operation['x-selectedCodeSample'] ?? examples[0]?.id,
        path,
        (data) => encodeRequestData(data, runtime.mediaAdapters, resolvedParameters),
      ),
    };
  }, [runtime, type, path, method, operation, pathItem]);

  const content = <OperationContext value={state}>{children}</OperationContext>;
  const servers = operation.servers ?? pathItem.servers;
  if (!servers) return content;

  return <ServerProvider servers={servers as ServerObject[]}>{content}</ServerProvider>;
}

/** an external store, so selecting examples doesn't re-render the entire operation */
function createExampleStore(
  examples: ExampleRequest[],
  selected: string | undefined,
  path: string,
  encode: (data: RawRequestData) => RequestData,
): Pick<OperationState, 'getExample' | 'setExample' | 'update' | 'subscribe'> {
  const listeners = new Set<ExampleListener>();
  function notify(item: ExampleRequest) {
    for (const listener of listeners) listener(item);
  }

  return {
    getExample: () => selected,
    setExample(id) {
      const item = examples.find((item) => item.id === id);
      if (!item) return;

      selected = id;
      notify(item);
    },
    update(data, encoded = encode(data)) {
      const item = examples.find((item) => item.id === selected);
      if (!item) return;
      // persistent changes
      item.data = data;
      item.encoded = encoded;
      item.pathname = pathnameFromRequest(path, encoded);
      notify(item);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function useOperationState(): OperationState {
  const ctx = use(OperationContext);
  if (!ctx) throw new Error('Component must be used under <OperationProvider />');

  return ctx;
}

export function useOperation(): OperationInfo {
  return useOperationState().info;
}

/**
 * Example requests of the operation, and the selected one.
 *
 * It doesn't follow the updates of items, use `useExampleRequest()` for the data of selected one.
 */
export function useExampleRequests(): {
  items: ExampleRequest[];
  selected: string | undefined;
  select: (id: string) => void;
  /** update the data of selected example */
  update: (data: RawRequestData) => void;
} {
  const { examples, getExample, setExample, update, subscribe } = useOperationState();
  const selected = useSyncExternalStore(subscribe, getExample, getExample);

  return { items: examples, selected, select: setExample, update };
}

function useSelectedExample(): ExampleRequest | undefined {
  const { examples, getExample, subscribe } = useOperationState();
  // items are updated in place, `encoded` changes on both selection and updates
  const getSnapshot = () => examples.find((item) => item.id === getExample())?.encoded;
  const encoded = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return examples.find((item) => item.encoded === encoded);
}

/**
 * Data of the selected example request, following its updates.
 */
export function useExampleRequest(): RawRequestData | undefined {
  return useSelectedExample()?.data;
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
  const { mediaAdapters } = useOpenAPI();
  const { info } = useOperationState();
  const { server } = useServer();
  const codegen = info.codeUsages.get(id);
  const { encoded, pathname } = useSelectedExample() ?? {};
  const isClient = useIsClient();

  return useMemo(() => {
    if (!encoded || !pathname || !codegen) return;
    const url = joinURL(
      server && isClient
        ? new URL(resolveServerUrl(server.url, server.variables), window.location.origin).href
        : 'https://example.com',
      pathname,
    );

    return codegen.generate(
      { ...encoded, url },
      {
        mediaAdapters,
        custom: null,
      },
    );
  }, [encoded, pathname, server, isClient, codegen, mediaAdapters]);
}

/**
 * Responses of the operation, with example values of their preferred media type.
 */
export function useResponseExamples(): ResponseTab[] {
  const { responses } = useOperation();
  const { resolve } = useOpenAPI().doc;
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
              example.summary ??
              t('Example {key}', {
                variables: { key },
              }),
            sample: getRaw(example.value),
            description: example.description,
          });
        }
      } else if (responseOfType?.example !== undefined) {
        tab.examples = [{ label: t('Example'), sample: getRaw(responseOfType.example) }];
      } else if (responseOfType?.schema) {
        tab.examples = [{ label: t('Example'), sample: sample(responseOfType.schema) }];
      }

      tabs.push(tab);
    }

    return tabs;
  }, [responses, resolve, t]);
}
