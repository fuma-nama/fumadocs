import type { OpenAPIV3_2, OpenAPIV3 } from './_openapi/types';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { OpenAPIOptions } from '@/server';
import type { CreateAPIPageOptions } from './ui/base';
import type { HTMLAttributes, ReactNode } from 'react';
import type { InlineCodeUsageGenerator } from './requests/generators';

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
  'x-codeSamples'?: InlineCodeUsageGenerator[];
  'x-selectedCodeSample'?: string;
  'x-exclusiveCodeSample'?: string;
};

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export interface RenderContext
  extends
    Pick<OpenAPIOptions, 'proxyUrl'>,
    Omit<
      RequireKeys<CreateAPIPageOptions, 'renderMarkdown' | 'generateTypeScriptDefinitions'>,
      'renderCodeBlock' | 'renderHeading' | 'generateTypeScriptSchema'
    > {
  /**
   * dereferenced schema
   */
  schema: ProcessedDocument;
  clientBoundary: typeof import('@/ui/client/boundary');

  mediaAdapters: Record<string, MediaAdapter>;

  renderHeading: (
    depth: number,
    text: string | ReactNode,
    props?: HTMLAttributes<HTMLHeadingElement> & { id?: string },
  ) => ReactNode;
  renderCodeBlock: (lang: string, code: string) => ReactNode;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
