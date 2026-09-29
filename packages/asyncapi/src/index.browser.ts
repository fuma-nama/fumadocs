/**
 * Browser build of the package entry: `generateFiles()` reads and writes files,
 * so it is stubbed here and the rest of the entry stays importable from client code.
 */
export * from './utils/create-page';
export type { CodeBlockProps } from 'shared-api/components/defaults';
export { useServer, type SelectedServer } from './utils/use-server';
export type {
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
  OperationItem,
  GeneratedPageProps,
} from './utils/pages/builder';
export type { SchemaToPagesOptions } from './utils/pages/preset-auto';
export type { ExampleMessageItem } from './utils/get-example-messages';
export type * as AsyncAPI from '@/types/asyncapi-3';

export async function generateFiles(): Promise<void> {
  throw new Error('`generateFiles` is only available on Node.js.');
}

export async function generateFilesOnly(): Promise<never> {
  throw new Error('`generateFilesOnly` is only available on Node.js.');
}
