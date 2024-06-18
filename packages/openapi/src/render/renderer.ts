import { createElement } from './element';

export interface TabsProps {
  items: string[];
}

export interface TabProps {
  value: string;
}

export interface APIInfoProps {
  method?: string;
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
  ResponseTabs: (props: TabsProps, child: string[]) => string;
  ResponseTab: (props: TabProps, child: string[]) => string;
  ExampleResponse: (child: string[]) => string;
  TypeScriptResponse: (child: string[]) => string;
  Property: (props: PropertyProps, child: string[]) => string;

  /**
   * Collapsible to show object schemas
   */
  ObjectCollapsible: (props: ObjectCollapsibleProps, child: string[]) => string;
}

export const defaultRenderer: Renderer = {
  Root: (child) => createElement('Root', {}, ...child),
  API: (child) => createElement('API', {}, ...child),
  APIInfo: (props, child) => createElement('APIInfo', props, ...child),
  APIExample: (child) => createElement('APIExample', {}, ...child),
  ResponseTabs: (props, child) =>
    createElement('ResponseTabs', props, ...child),
  ResponseTab: (props, child) => createElement('ResponseTab', props, ...child),
  ExampleResponse: (child) => createElement('ExampleResponse', {}, ...child),
  TypeScriptResponse: (child) =>
    createElement('TypeScriptResponse', {}, ...child),
  Property: (props, child) => createElement('Property', props, ...child),
  ObjectCollapsible: (props, child) =>
    createElement('ObjectCollapsible', props, ...child),
};
