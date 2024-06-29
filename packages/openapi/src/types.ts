import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { type Renderer } from '@/render/renderer';
import type { Endpoint } from '@/endpoint';
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

export interface RenderContext {
  renderer: Renderer;
  document: OpenAPI.Document;
  baseUrl: string;
  generateCodeSamples?: (endpoint: Endpoint) => CodeSample[];
}
