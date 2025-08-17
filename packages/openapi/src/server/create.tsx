import type { ApiPageProps } from '@/render/api-page';
import { createProxy } from '@/server/proxy';
import type { CodeSample } from '@/render/operation';
import type { Renderer } from '@/render/renderer';
import type { NoReference } from '@/utils/schema';
import type {
  BuiltinTheme,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
} from 'shiki';
import type { MediaAdapter } from '@/media/adapter';
import type { MethodInformation } from '@/types';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import {
  processDocument,
  type ProcessedDocument,
} from '@/utils/process-document';

type Awaitable<T> = T | Promise<T>;
/**
 * schema id -> downloaded schema object
 */
type SchemaMap = Record<string, OpenAPIV3_1.Document | OpenAPIV3.Document>;
type ProcessedSchemaMap = Record<string, ProcessedDocument>;

export interface SharedOpenAPIOptions {
  /**
   * The url of proxy to avoid CORS issues
   */
  proxyUrl?: string;

  renderer?: Partial<Renderer>;

  /**
   * Disable API Playground
   *
   * @defaultValue false
   */
  disablePlayground?: boolean;

  /**
   * Generate TypeScript definitions from response schema.
   *
   * Pass `false` to disable it.
   *
   * @param method - the operation object
   * @param statusCode - status code
   */
  generateTypeScriptSchema?:
    | ((
        method: NoReference<MethodInformation>,
        statusCode: string,
      ) => Awaitable<string>)
    | false;

  /**
   * Generate code samples for endpoint.
   */
  generateCodeSamples?: (method: MethodInformation) => Awaitable<CodeSample[]>;

  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> &
    CodeOptionsThemes<BuiltinTheme>;

  /**
   * Show full response schema instead of only example response & Typescript definitions
   *
   * @default true
   */
  showResponseSchema?: boolean;

  mediaAdapters?: Record<string, MediaAdapter>;
}

export interface OpenAPIOptions extends SharedOpenAPIOptions {
  /**
   * Schema files, can be:
   * - URL
   * - file path
   * - a function returning records of downloaded schemas.
   */
  input?: string[] | (() => Promise<SchemaMap>);

  /**
   * By default, it is disabled on dev mode
   */
  disableCache?: boolean;
}

export interface OpenAPIServer {
  getAPIPageProps: (from: ApiPageProps) => ApiPageProps;
  createProxy: typeof createProxy;
  getSchemas: () => Promise<ProcessedSchemaMap>;
}

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  const {
    input = [],
    disableCache = process.env.NODE_ENV === 'development',
    ...shared
  } = options;
  let schemas: Promise<ProcessedSchemaMap> | undefined;

  async function getSchemas() {
    const out: ProcessedSchemaMap = {};

    if (Array.isArray(input)) {
      await Promise.all(
        input.map(async (item) => {
          out[item] = await processDocument(item, disableCache);
        }),
      );
    } else {
      await Promise.all(
        Object.entries(await input()).map(async ([k, v]) => {
          out[k] = await processDocument(v, disableCache);
        }),
      );
    }

    return out;
  }

  return {
    createProxy,
    async getSchemas() {
      return (schemas ??= getSchemas());
    },
    getAPIPageProps({ document, ...props }) {
      return {
        ...shared,
        ...props,
        document:
          typeof document === 'string'
            ? this.getSchemas().then((map) => {
                return map[document] ?? processDocument(document, disableCache);
              })
            : document,
      };
    },
  };
}

export function createCodeSample<T>(options: CodeSample<T>): CodeSample {
  return options as CodeSample;
}
