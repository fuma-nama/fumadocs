import type { OpenAPIV3_2, OpenAPIV3 } from './types/openapi';
import type { DereferencedDocument } from '@/utils/document/dereference';
import type { OpenAPIOptions } from '@/server';
import type { InlineCodeUsageGenerator } from './requests/generators';
import type { CreateOpenAPIPageOptions } from './ui';

export type Document = OpenAPIV3_2.Document;
export type OperationObject = OpenAPIV3_2.OperationObject & {
  'x-codeSamples'?: InlineCodeUsageGenerator[];
  'x-selectedCodeSample'?: string;
  'x-exclusiveCodeSample'?: string;
};
export type ParameterObject = OpenAPIV3_2.ParameterObject;
export type SecuritySchemeObject = OpenAPIV3_2.SecuritySchemeObject;
export type ReferenceObject = OpenAPIV3_2.ReferenceObject;
export type PathItemObject = OpenAPIV3_2.PathItemObject;
export type TagObject = OpenAPIV3_2.TagObject;
export type ServerObject = OpenAPIV3_2.ServerObject;
export type CallbackObject = OpenAPIV3_2.CallbackObject;
export type ServerVariableObject = OpenAPIV3.ServerVariableObject;
export type ResponseObject = OpenAPIV3_2.ResponseObject;
export type OAuth2SecurityScheme = OpenAPIV3_2.OAuth2SecurityScheme;
export type HttpMethods = OpenAPIV3_2.HttpMethods;
export type ExampleObject = OpenAPIV3_2.ExampleObject;
export type MediaTypeObject = OpenAPIV3_2.MediaTypeObject;
export type RequestBodyObject = OpenAPIV3_2.RequestBodyObject;

/** the options of `createOpenAPIPage()` and the page's document, passed to render options */
export interface RenderContext extends Pick<OpenAPIOptions, 'proxyUrl'>, CreateOpenAPIPageOptions {
  /**
   * dereferenced schema
   */
  schema: DereferencedDocument;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
