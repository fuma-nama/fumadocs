'use client';
import type { FC } from 'react';
import type { Document } from '@/types';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { createPageComponents } from 'shared-api/components/defaults';
import type { OpenAPIPageProps } from '@/utils/pages/builder';
import { defaultAdapters } from '@/requests/media/adapter';
import { AuthProvider } from '@/playground/auth';
import { useMemo } from 'react';
import {
  ComponentsContext,
  type CreateOpenAPIPageOptions,
  type OpenAPIComponents,
  OpenAPIContext,
  type OpenAPIProviderProps,
  type OpenAPIRuntime,
  type PageLayoutProps,
  ServerProvider,
  useOpenAPI,
} from './runtime';

export {
  useOpenAPI,
  useComponents,
  useServer,
  useTypeScriptDefinitions,
  type OpenAPIComponents,
  type CodeBlockProps,
  type OpenAPIRuntime,
  type OpenAPIProviderProps,
  type CreateOpenAPIPageOptions,
  type PageOperationProps,
  type PageLayoutProps,
  type SelectedServer,
} from './runtime';
export { useAuth } from '@/playground/auth';
export * from './operation';

// the request pipeline of the playground, so an installed UI drives it instead of copying it
export type { RawRequestData, RequestData } from '@/requests/types';
export {
  encodeRequestData,
  type EncodedParameter,
  type EncodedParameterMultiple,
} from '@/requests/media/encode';
export { isMediaTypeSupported, resolveMediaAdapter } from '@/requests/media/resolve-adapter';
export {
  type BrowserFetcherOptions,
  createBrowserFetcher,
  type FetchErrorResult,
  type Fetcher,
  type FetchResponseResult,
  type FetchResult,
} from '@/playground/fetcher';
export { getPreferredType } from '@/utils/schema';

/**
 * The runtime of an API page, for UIs built from the headless hooks.
 */
export function OpenAPIProvider({
  document,
  mediaAdapters,
  codeUsages,
  generateCodeSamples,
  generateTypeScriptDefinitions,
  proxyUrl,
  storageKeyPrefix = 'fumadocs-openapi-',
  components,
  children,
}: OpenAPIProviderProps) {
  const runtime = useMemo<OpenAPIRuntime>(
    () => ({
      doc: dereferenceBundledDocument(document),
      mediaAdapters: { ...defaultAdapters, ...mediaAdapters },
      codeUsages,
      generateCodeSamples,
      generateTypeScriptDefinitions,
      proxyUrl,
      storageKeyPrefix,
    }),
    [
      document,
      mediaAdapters,
      codeUsages,
      generateCodeSamples,
      generateTypeScriptDefinitions,
      proxyUrl,
      storageKeyPrefix,
    ],
  );

  return (
    <OpenAPIContext value={runtime}>
      <ComponentsContext value={components}>
        <ServerProvider servers={runtime.doc.dereferenced.servers}>
          <AuthProvider>{children}</AuthProvider>
        </ServerProvider>
      </ComponentsContext>
    </OpenAPIContext>
  );
}

/**
 * Create `<OpenAPIPage />` from your own UI, it takes the props of generated pages.
 */
export function createOpenAPIPage({
  components,
  shiki,
  shikiOptions,
  ...options
}: CreateOpenAPIPageOptions): FC<OpenAPIPageProps> {
  const { Operation, Layout = DefaultLayout } = components;
  const slots: OpenAPIComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ shiki, shikiOptions, components }).components,
  };

  function Content({ showTitle, showDescription, operations, webhooks }: OpenAPIPageProps) {
    const { dereferenced, resolve } = useOpenAPI().doc;

    return (
      <Layout
        operations={operations?.map((item) => {
          const pathItem = resolve(dereferenced.paths?.[item.path]);
          if (!pathItem)
            throw new Error(`[Fumadocs OpenAPI] Path not found in OpenAPI schema: ${item.path}`);
          const operation = pathItem[item.method];
          if (!operation)
            throw new Error(
              `[Fumadocs OpenAPI] Method ${item.method} not found in operation: ${item.path}`,
            );

          return {
            item,
            children: (
              <Operation
                key={`${item.path}:${item.method}`}
                type="operation"
                path={item.path}
                method={item.method}
                operation={operation}
                pathItem={pathItem}
                showTitle={showTitle}
                showDescription={showDescription}
              />
            ),
          };
        })}
        webhooks={webhooks?.map((item) => {
          const pathItem = resolve(dereferenced.webhooks?.[item.name]);
          if (!pathItem)
            throw new Error(`[Fumadocs OpenAPI] Webhook not found in OpenAPI schema: ${item.name}`);
          const operation = pathItem[item.method];
          if (!operation)
            throw new Error(
              `[Fumadocs OpenAPI] Method ${item.method} not found in webhook: ${item.name}`,
            );

          return {
            item,
            children: (
              <Operation
                key={`${item.name}:${item.method}`}
                type="webhook"
                path={`/${item.name}`}
                method={item.method}
                operation={operation}
                pathItem={pathItem}
                showTitle={showTitle}
                showDescription={showDescription}
              />
            ),
          };
        })}
      />
    );
  }

  return function OpenAPIPage(props) {
    let document: Document;
    let proxyUrl: string | undefined;
    if ('preloaded' in props) {
      document = props.preloaded.docs[props.document];
      if (!document)
        throw new Error(
          `[Fumadocs OpenAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <OpenAPIPage />`,
        );
      proxyUrl = props.preloaded.proxyUrl;
    } else {
      document = props.payload.bundled;
      proxyUrl = props.payload.proxyUrl;
    }

    return (
      <OpenAPIProvider {...options} document={document} proxyUrl={proxyUrl} components={slots}>
        <Content {...props} />
      </OpenAPIProvider>
    );
  };
}

function DefaultLayout({ operations, webhooks }: PageLayoutProps) {
  return (
    <>
      {operations?.map((item) => item.children)}
      {webhooks?.map((item) => item.children)}
    </>
  );
}
