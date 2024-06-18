import { codeblock, createElement } from './element';

export interface TabsProps {
  items: string[];
}

export interface TabProps {
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

export interface Renderer {
  Root: (child: string[]) => string;
  API: (child: string[]) => string;
  APIInfo: (props: APIInfoProps, child: string[]) => string;
  APIExample: (child: string[]) => string;

  Responses: (props: TabsProps, child: string[]) => string;
  Response: (props: TabProps, child: string[]) => string;

  ResponseTypes: (child: string[]) => string;
  ExampleResponse: (json: string) => string;
  TypeScriptResponse: (code: string) => string;

  /**
   * Collapsible to show object schemas
   */
  ObjectCollapsible: (props: ObjectCollapsibleProps, child: string[]) => string;
  Property: (props: PropertyProps, child: string[]) => string;
}

export const defaultRenderer: Renderer = {
  Root: (child) => createElement('Root', {}, ...child),
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
};
