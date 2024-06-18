import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { type Renderer } from '@/render/renderer';

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
  baseUrl: string;
}
