/**
 * Browser build of the package entry: `generateFiles()` reads and writes files,
 * so it is stubbed here and the rest of the entry stays importable from client code.
 */
export * from './utils/create-page';
export type { CodeBlockProps } from 'shared-api/components/defaults';
export { useServer, type SelectedServer } from './utils/use-server';
export type { MediaAdapter } from '@/requests/media/adapter';
export type * from './types';
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

export async function generateFiles(): Promise<void> {
  throw new Error('`generateFiles` is only available on Node.js.');
}

export async function generateFilesOnly(): Promise<never> {
  throw new Error('`generateFilesOnly` is only available on Node.js.');
}
