import type { OpenAPIV3_1 as V3_1, OpenAPIV3 as V3 } from 'openapi-types';
import type { default as Slugger } from 'github-slugger';
import { type Renderer } from '@/render/renderer';
import type { EndpointSample } from '@/schema/sample';
import type { CodeSample } from '@/render/operation';
import type {
  BuiltinTheme,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
} from 'shiki';
import type { NoReference } from '@/utils/schema';

export type Document = V3.Document | V3_1.Document;
export type OperationObject = V3.OperationObject | V3_1.OperationObject;
export type ParameterObject = V3.ParameterObject | V3_1.ParameterObject;
export type SecurityRequirementObject =
  | V3.SecurityRequirementObject
  | V3_1.SecurityRequirementObject;
export type SecuritySchemeObject =
  | V3.SecuritySchemeObject
  | V3_1.SecuritySchemeObject;
export type ReferenceObject = V3.ReferenceObject | V3_1.ReferenceObject;
export type SchemaObject = V3.SchemaObject | V3_1.SchemaObject;

export interface RouteInformation {
  path: string;
  summary?: string;
  description?: string;
  methods: MethodInformation[];
}

export type MethodInformation = Omit<OperationObject, 'parameters'> & {
  parameters: NoReference<ParameterObject>[];
  method: string;
};

type Awaitable<T> = T | Promise<T>;

export interface RenderContext {
  renderer: Renderer;
  document: Document;
  baseUrl: string;
  slugger: Slugger;

  /**
   * Generate TypeScript definitions from response schema.
   *
   * Pass `false` to disable it.
   *
   * @param endpoint - the API endpoint
   * @param code - status code
   */
  generateTypeScriptSchema?:
    | ((endpoint: EndpointSample, code: string) => Awaitable<string>)
    | false;

  /**
   * Generate code samples for endpoint.
   */
  generateCodeSamples?: (endpoint: EndpointSample) => Awaitable<CodeSample[]>;

  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> &
    CodeOptionsThemes<BuiltinTheme>;
}
