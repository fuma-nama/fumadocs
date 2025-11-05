import type { OpenAPIV3_1 as V3_1 } from 'openapi-types';
import type { default as Slugger } from 'github-slugger';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { OpenAPIOptions } from '@/server';
import type { CreateAPIPageOptions } from './ui/api-page';
import type { CodeUsageGenerator } from './ui/operation/example-panel';
import type { ReactNode } from 'react';

export type Document = V3_1.Document;
export type OperationObject = V3_1.OperationObject;
export type ParameterObject = V3_1.ParameterObject;
export type SecuritySchemeObject = V3_1.SecuritySchemeObject;
export type ReferenceObject = V3_1.ReferenceObject;
export type PathItemObject = V3_1.PathItemObject;
export type TagObject = V3_1.TagObject;
export type ServerObject = V3_1.ServerObject;
export type CallbackObject = V3_1.CallbackObject;
export type ServerVariableObject = V3_1.ServerVariableObject;
export type ResponseObject = V3_1.ResponseObject;

export type MethodInformation = NoReference<OperationObject> & {
  method: string;
  'x-codeSamples'?: Omit<CodeUsageGenerator, 'id'>[];
  'x-selectedCodeSample'?: string;
  'x-exclusiveCodeSample'?: string;
};

export interface RenderContext
  extends Pick<OpenAPIOptions, 'proxyUrl'>,
    CreateAPIPageOptions {
  servers: NoReference<ServerObject>[];
  slugger: Slugger;

  /**
   * dereferenced schema
   */
  schema: ProcessedDocument;

  mediaAdapters: Record<string, MediaAdapter>;

  renderHeading: (depth: number, text: string) => ReactNode;
  renderMarkdown: (text: string) => ReactNode;
  renderCodeBlock: (lang: string, code: string) => ReactNode;
}
