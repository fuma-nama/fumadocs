import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { default as Slugger } from 'github-slugger';
import { type Renderer } from '@/render/renderer';
import type { EndpointSample } from '@/schema/sample';
import type { CodeSample } from '@/render/operation';

export interface RouteInformation {
  path: string;
  summary?: string;
  description?: string;
  methods: MethodInformation[];
}

export interface MethodInformation extends OpenAPI.OperationObject {
  parameters: OpenAPI.ParameterObject[];
  method: string;
}

type Awaitable<T> = T | Promise<T>;

export interface RenderContext {
  renderer: Renderer;
  document: OpenAPI.Document;
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
}
