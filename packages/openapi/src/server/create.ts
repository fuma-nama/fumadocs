import { createProxy } from '@/server/proxy';
import { processDocument, type ProcessedDocument } from '@/utils/process-document';
import type { Document } from '@/types';
import type { InlineCodeUsageGenerator } from '@/requests/generators';
import fs from 'node:fs';

/**
 * schema id -> file path, URL, or downloaded schema object
 */
type SchemaMap = Record<string, string | Document>;
type ProcessedSchemaMap = Record<string, ProcessedDocument>;

export interface OpenAPIOptions {
  /**
   * Schema files, can be:
   * - URL
   * - file path
   * - a function returning records of downloaded schemas.
   */
  input?: string[] | (() => SchemaMap | Promise<SchemaMap>);

  disableCache?: boolean;

  /**
   * The url of proxy to avoid CORS issues
   */
  proxyUrl?: string;
}

export interface OpenAPIServer {
  createProxy: typeof createProxy;
  getSchemas: () => Promise<ProcessedSchemaMap>;
  getSchema: (document: string) => Promise<ProcessedDocument>;
  /** @private internal API */
  _getWatchPaths: () => string[];
  readonly options: OpenAPIOptions;
}

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  const { input = [], disableCache = false } = options;
  let schemas: Promise<ProcessedSchemaMap> | undefined;

  async function getSchemas(): Promise<ProcessedSchemaMap> {
    if (Array.isArray(input)) {
      const entries = await Promise.all(
        input.map(async (item) => [item, await processDocument(item)]),
      );
      return Object.fromEntries(entries);
    } else {
      const entries = await Promise.all(
        Object.entries(await input()).map(async ([k, v]) => [k, await processDocument(v)]),
      );
      return Object.fromEntries(entries);
    }
  }

  return {
    options,
    createProxy,
    _getWatchPaths() {
      const keys = Array.isArray(input) ? input : Object.keys(input);
      return keys.filter((key) => !URL.canParse(key) && fs.existsSync(key));
    },
    async getSchema(document) {
      const schemas = await this.getSchemas();
      if (document in schemas) return schemas[document];

      console.warn(
        `[Fumadocs OpenAPI] the document "${document}" is not listed in the input array, this may not be expected.`,
      );
      // do not cache unlisted documents
      return processDocument(document);
    },
    async getSchemas() {
      if (disableCache) return getSchemas();

      return (schemas ??= getSchemas());
    },
  };
}

/**
 * @deprecated
 */
export function createCodeSample<T>(
  options: InlineCodeUsageGenerator<T>,
): InlineCodeUsageGenerator<T> {
  return options;
}
