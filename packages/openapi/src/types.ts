import type { OpenAPIV3_1 as V3_1 } from 'openapi-types';
import type { default as Slugger } from 'github-slugger';
import { type Renderer } from '@/render/renderer';
import type { CodeSample } from '@/render/operation';
import type {
  BuiltinTheme,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
} from 'shiki';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
import type { MediaAdapter } from '@/media/adapter';

export type Document = V3_1.Document;
export type OperationObject = V3_1.OperationObject;
export type ParameterObject = V3_1.ParameterObject;
export type SecurityRequirementObject = V3_1.SecurityRequirementObject;
export type SecuritySchemeObject = V3_1.SecuritySchemeObject;
export type ReferenceObject = V3_1.ReferenceObject;
export type PathItemObject = V3_1.PathItemObject;
export type TagObject = V3_1.TagObject;
export type ServerObject = NoReference<V3_1.ServerObject>;
export type CallbackObject = NoReference<V3_1.CallbackObject>;
export type ServerVariableObject = NoReference<V3_1.ServerVariableObject>;

export type MethodInformation = NoReference<OperationObject> & {
  method: string;
};

type Awaitable<T> = T | Promise<T>;

/**
 * Dereferenced value and its original `$ref` value
 */
export type DereferenceMap = Map<unknown, string>;

export interface RenderContext {
  /**
   * The url of proxy to avoid CORS issues
   */
  proxyUrl?: string;

  renderer: Renderer;

  /**
   * Disable API Playground
   */
  disablePlayground?: boolean;

  servers: ServerObject[];

  slugger: Slugger;

  /**
   * dereferenced schema
   */
  schema: ProcessedDocument;

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

  mediaAdapters: Record<string, MediaAdapter>;
}
