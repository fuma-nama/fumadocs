'use client';
import { useMemo, type ReactNode } from 'react';
import { generate } from '@fumari/json-schema-ts';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import type { Document } from '@/types';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { defaultAdapters } from '@/requests/media/adapter';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
import { AuthProvider } from '@/playground/auth';
import {
  OpenAPIContextProvider,
  type OpenAPIComponents,
  type OpenAPIContextType,
  ServerProvider,
} from './runtime';

export {
  useOpenAPI,
  useComponents,
  useServer,
  useTypeScriptDefinitions,
  type OpenAPIComponents,
  type CodeBlockProps,
  type OpenAPIRuntime,
  type GenerateTypeScriptDefinitionsContext,
  type SelectedServer,
} from './runtime';
export { useAuth } from '@/playground/auth';
export { useStorageKey } from '@/utils/storage-key';
export {
  OperationProvider,
  useOperation,
  useExampleRequests,
  useExampleRequest,
  useCodeUsages,
  useCodeUsage,
  useResponseExamples,
  type OperationProviderProps,
  type OperationInfo,
  type OperationParameters,
  type OperationSecurity,
  type OperationResponse,
  type OperationCallback,
  type ExampleRequest,
  type CodeUsageInfo,
  type ResponseTab,
  type ResponseExample,
  type RawRequestData,
} from './operation';

export interface OpenAPIProviderProps extends Partial<
  Pick<
    OpenAPIContextType,
    | 'mediaAdapters'
    | 'codeUsages'
    | 'generateCodeSamples'
    | 'generateTypeScriptDefinitions'
    | 'proxyUrl'
    | 'storageKeyPrefix'
  >
> {
  /** the bundled OpenAPI document */
  document: Document;
  components: OpenAPIComponents;
  children: ReactNode;
}

/**
 * Generate TypeScript definitions with `@fumari/json-schema-ts`.
 */
export const defaultTypeScriptDefinitions: Exclude<
  OpenAPIContextType['generateTypeScriptDefinitions'],
  false
> = (schema, ctx) => {
  if (typeof schema !== 'object') return;

  try {
    // `generate` resolves `$ref`s against the schema root itself,
    // spread the bundled document into the root so in-document refs are resolvable
    return generate(
      { ...(ctx.document.bundled as object), ...getRaw(schema) },
      {
        name: ctx.name,
        readOnly: ctx.readOnly,
        writeOnly: ctx.writeOnly,
      },
    );
  } catch (e) {
    console.warn('Failed to generate typescript schema:', e);
  }
};

/**
 * The runtime of an API page, for UIs built from the headless hooks.
 */
export function OpenAPIProvider({
  document,
  mediaAdapters,
  codeUsages,
  generateCodeSamples,
  generateTypeScriptDefinitions = defaultTypeScriptDefinitions,
  proxyUrl,
  storageKeyPrefix,
  components,
  children,
}: OpenAPIProviderProps) {
  const runtime = useMemo<OpenAPIContextType>(
    () => ({
      document: dereferenceBundledDocument(document),
      mediaAdapters: { ...defaultAdapters, ...mediaAdapters },
      codeUsages: codeUsages ?? registerDefault(createCodeUsageGeneratorRegistry()),
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
    <OpenAPIContextProvider runtime={runtime} components={components}>
      <ServerProvider servers={runtime.document.dereferenced.servers}>
        <AuthProvider>{children}</AuthProvider>
      </ServerProvider>
    </OpenAPIContextProvider>
  );
}
