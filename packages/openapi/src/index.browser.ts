/**
 * Browser build of the package entry: `generateFiles()` reads and writes files,
 * so it is stubbed here and the rest of the entry stays importable from client code.
 */
import type { FC } from 'react';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createRenderer, type CreateOpenAPIRendererOptions } from './utils/create-page';
import type { OpenAPIPageProps } from './utils/pages/builder';

export {
  createOpenAPIBaseRenderer,
  useOpenAPI,
  useComponents,
  useRenderContext,
  useTypeScriptDefinitions,
} from './utils/create-page';
export type {
  OpenAPIComponents,
  GenerateTypeScriptDefinitionsContext,
  OpenAPIRuntimeOptions,
  OpenAPIRuntime,
  APIPlaygroundProps,
  OperationPlaygroundOptions,
  PageLayoutProps,
  OpenAPIRenderOptions,
  RenderContext,
  CreateOpenAPIRendererOptions,
} from './utils/create-page';
export type { CodeBlockProps } from 'shared-api/components/defaults';
export { useServer, type SelectedServer } from './utils/use-server';
export type { MediaAdapter } from '@/requests/media/adapter';
export type {
  Document,
  OperationObject,
  ParameterObject,
  SecuritySchemeObject,
  ReferenceObject,
  PathItemObject,
  TagObject,
  ServerObject,
  CallbackObject,
  ServerVariableObject,
  ResponseObject,
  OAuth2SecurityScheme,
  OAuthFlows,
  HttpMethods,
  ExampleObject,
  MediaTypeObject,
  RequestBodyObject,
} from './types';
export type {
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
  WebhookOutput,
  OperationItem,
  WebhookItem,
  GeneratedPageProps,
} from './utils/pages/builder';
export type { SchemaToPagesOptions } from './utils/pages/preset-auto';
export type { OpenAPIV3_2, OpenAPIV3_1, OpenAPIV3, OpenAPIV2, OpenAPI } from '@/types/openapi';

/**
 * Create `<OpenAPIPage />` from your own UI, it takes the props of generated pages.
 */
export function createOpenAPIRenderer(options: CreateOpenAPIRendererOptions): FC<OpenAPIPageProps> {
  return createRenderer({ ...options, shiki: options.shiki ?? defaultShikiFactory });
}

export async function generateFiles(): Promise<void> {
  throw new Error('`generateFiles` is only available on Node.js.');
}

export async function generateFilesOnly(): Promise<never> {
  throw new Error('`generateFilesOnly` is only available on Node.js.');
}
