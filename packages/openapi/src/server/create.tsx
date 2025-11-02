import { createProxy } from '@/server/proxy';
import type { CodeSample } from '@/ui/operation';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import {
  processDocument,
  type ProcessedDocument,
} from '@/utils/process-document';

/**
 * schema id -> downloaded schema object
 */
type SchemaMap = Record<string, OpenAPIV3_1.Document | OpenAPIV3.Document>;
type ProcessedSchemaMap = Record<string, ProcessedDocument>;

export interface OpenAPIOptions {
  /**
   * Schema files, can be:
   * - URL
   * - file path
   * - a function returning records of downloaded schemas.
   */
  input?: string[] | (() => Promise<SchemaMap>);

  disableCache?: boolean;

  /**
   * The url of proxy to avoid CORS issues
   */
  proxyUrl?: string;
}

export interface OpenAPIServer {
  createProxy: typeof createProxy;
  getSchemas: () => Promise<ProcessedSchemaMap>;
  readonly options: OpenAPIOptions;
}

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  const { input = [], disableCache = false } = options;
  let schemas: Promise<ProcessedSchemaMap> | undefined;

  async function getSchemas() {
    const out: ProcessedSchemaMap = {};

    if (Array.isArray(input)) {
      await Promise.all(
        input.map(async (item) => {
          out[item] = await processDocument(item);
        }),
      );
    } else {
      await Promise.all(
        Object.entries(await input()).map(async ([k, v]) => {
          out[k] = await processDocument(v);
        }),
      );
    }

    return out;
  }

  return {
    options,
    createProxy,
    async getSchemas() {
      if (disableCache) return getSchemas();

      return (schemas ??= getSchemas());
    },
  };
}

export function createCodeSample<T>(options: CodeSample<T>): CodeSample {
  return options as CodeSample;
}
