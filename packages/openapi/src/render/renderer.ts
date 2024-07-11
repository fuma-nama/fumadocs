import type { APIPlaygroundProps } from '@/render/playground';
import { codeblock, createElement } from './element';

export interface ResponsesProps {
  items: string[];
}

export interface ResponseProps {
  value: string;
}

export interface APIInfoProps {
  method: string;
  route: string;
}

export interface PropertyProps {
  name: string;
  type: string;
  required?: boolean;
  deprecated?: boolean;
}

export interface ObjectCollapsibleProps {
  name: string;
}

export interface RequestProps {
  language: string;
  name: string;
  code: string;
}

export interface RootProps {
  baseUrl?: string;
}

export interface Renderer {
  Root: (props: RootProps, child: string[]) => string;
  API: (child: string[]) => string;
  APIInfo: (props: APIInfoProps, child: string[]) => string;
  APIExample: (child: string[]) => string;

  Responses: (props: ResponsesProps, child: string[]) => string;
  Response: (props: ResponseProps, child: string[]) => string;

  Requests: (items: string[], child: string[]) => string;
  Request: (props: RequestProps) => string;

  ResponseTypes: (child: string[]) => string;
  ExampleResponse: (json: string) => string;
  TypeScriptResponse: (code: string) => string;

  /**
   * Collapsible to show object schemas
   */
  ObjectCollapsible: (props: ObjectCollapsibleProps, child: string[]) => string;
  Property: (props: PropertyProps, child: string[]) => string;
  APIPlayground: (props: APIPlaygroundProps) => string;
}

export type {
  APIPlaygroundProps,
  RequestSchema,
  PrimitiveRequestField,
  ReferenceSchema,
} from '@/render/playground';

export const defaultRenderer: Renderer = {
  Root: (props, child) => createElement('Root', props, ...child),
  API: (child) => createElement('API', {}, ...child),
  APIInfo: (props, child) => createElement('APIInfo', props, ...child),
  APIExample: (child) => createElement('APIExample', {}, ...child),
  Responses: (props, child) => createElement('Responses', props, ...child),
  Response: (props, child) => createElement('Response', props, ...child),
  ResponseTypes: (child) => createElement('ResponseTypes', {}, ...child),
  ExampleResponse: (json) =>
    createElement('ExampleResponse', {}, codeblock({ language: 'json' }, json)),
  TypeScriptResponse: (code) =>
    createElement(
      'TypeScriptResponse',
      {},
      codeblock({ language: 'ts' }, code),
    ),
  Property: (props, child) => createElement('Property', props, ...child),
  ObjectCollapsible: (props, child) =>
    createElement('ObjectCollapsible', props, ...child),

  Requests: (items, child) => createElement('Requests', { items }, ...child),
  Request: ({ language, code, name }) =>
    createElement('Request', { value: name }, codeblock({ language }, code)),
  APIPlayground: (props) => createElement('APIPlayground', props),
};
