'use client';
import type { FC } from 'react';
import { generate } from '@fumari/json-schema-ts';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
} from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
import type { OpenAPIPageProps } from '@/utils/pages/builder';
import * as Base from './base';
import type { CreateOpenAPIPageOptions, OpenAPIProviderProps, OpenAPIRuntime } from './runtime';

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
export { useStorageKey } from '@/utils/storage-key';
export * from './operation';

const defaultTypeScriptDefinitions: Exclude<
  OpenAPIRuntime['generateTypeScriptDefinitions'],
  false | undefined
> = (schema, ctx) => {
  if (typeof schema !== 'object') return;

  try {
    // `generate` resolves `$ref`s against the schema root itself,
    // spread the bundled document into the root so in-document refs are resolvable
    return generate(
      { ...(ctx.doc.bundled as object), ...getRaw(schema) },
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

let defaultCodeUsages: CodeUsageGeneratorRegistry | undefined;

function withDefaults<
  T extends Pick<OpenAPIRuntime, 'codeUsages' | 'generateTypeScriptDefinitions'>,
>(options: T): T {
  return {
    ...options,
    codeUsages:
      options.codeUsages ??
      (defaultCodeUsages ??= registerDefault(createCodeUsageGeneratorRegistry())),
    generateTypeScriptDefinitions:
      options.generateTypeScriptDefinitions ?? defaultTypeScriptDefinitions,
  };
}

/**
 * The runtime of an API page, for UIs built from the headless hooks.
 */
export function OpenAPIProvider(props: OpenAPIProviderProps) {
  return <Base.OpenAPIProvider {...withDefaults(props)} />;
}

/**
 * Create `<OpenAPIPage />` from your own UI, it takes the props of generated pages.
 */
export function createOpenAPIPage(options: CreateOpenAPIPageOptions): FC<OpenAPIPageProps> {
  return Base.createOpenAPIPage(withDefaults(options));
}
