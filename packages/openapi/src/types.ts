import type { OpenAPIV3_2, OpenAPIV3 } from './_openapi/types';
import type { default as Slugger } from 'github-slugger';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { OpenAPIOptions } from '@/server';
import type { CreateAPIPageOptions } from './ui/base';
import type { CodeUsageGenerator } from './ui/operation/usage-tabs';
import type { HTMLAttributes, ReactNode } from 'react';

export type Document = OpenAPIV3_2.Document;
export type OperationObject = OpenAPIV3_2.OperationObject;
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

export type MethodInformation = NoReference<OperationObject> & {
  method: string;
  'x-codeSamples'?: Omit<CodeUsageGenerator, 'id'>[];
  'x-selectedCodeSample'?: string;
  'x-exclusiveCodeSample'?: string;
};

export interface RenderContext
  extends Pick<OpenAPIOptions, 'proxyUrl'>, Omit<CreateAPIPageOptions, 'renderMarkdown'> {
  slugger: Slugger;

  /**
   * dereferenced schema
   */
  schema: ProcessedDocument;

  mediaAdapters: Record<string, MediaAdapter>;

  renderHeading: (
    depth: number,
    text: string,
    props?: HTMLAttributes<HTMLHeadingElement>,
  ) => ReactNode;
  renderMarkdown: (text: string) => ReactNode;
  renderCodeBlock: (lang: string, code: string) => ReactNode;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
