import type { ComponentType, ReactNode } from 'react';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { APIPlaygroundProps } from '@/render/playground';
import { CodeBlock } from '@/render/codeblock';
import {
  API,
  Root,
  APIInfo,
  APIExample,
  Property,
  ObjectCollapsible,
  APIPlayground,
} from '@/ui';

export interface ResponsesProps {
  items: string[];
  children: ReactNode;
}

export interface ResponseProps {
  value: string;
  children: ReactNode;
}

export interface APIInfoProps {
  method: string;
  route: string;
  children: ReactNode;
}

export interface PropertyProps {
  name: string;
  type: string;
  required?: boolean;
  deprecated?: boolean;
  children?: ReactNode;
}

export interface ObjectCollapsibleProps {
  name: string;
  children: ReactNode;
}

export interface RequestProps {
  language: string;
  name: string;
  code: string;
}

export interface ResponseTypeProps {
  lang: string;
  code: string;
  label: string;
}

export interface RootProps {
  baseUrl?: string;
  children: ReactNode;
}

export interface Renderer {
  Root: ComponentType<RootProps>;
  API: ComponentType<{ children: ReactNode }>;
  APIInfo: ComponentType<APIInfoProps>;
  APIExample: ComponentType<{ children: ReactNode }>;

  Responses: ComponentType<ResponsesProps>;
  Response: ComponentType<ResponseProps>;
  Requests: ComponentType<{ items: string[]; children: ReactNode }>;
  Request: ComponentType<RequestProps>;
  ResponseTypes: ComponentType<{ children: ReactNode }>;
  ResponseType: ComponentType<ResponseTypeProps>;

  /**
   * Collapsible to show object schemas
   */
  ObjectCollapsible: ComponentType<ObjectCollapsibleProps>;
  Property: ComponentType<PropertyProps>;
  APIPlayground: ComponentType<APIPlaygroundProps>;
}

export type {
  APIPlaygroundProps,
  RequestSchema,
  PrimitiveRequestField,
  ReferenceSchema,
} from '@/render/playground';

export const defaultRenderer: Renderer = {
  Root,
  API,
  APIInfo,
  APIExample,
  Responses: Tabs,
  Response: Tab,
  ResponseTypes: (props) => (
    <Accordions
      type="single"
      className="!-m-4 border-none pt-2"
      defaultValue="Response"
    >
      {props.children}
    </Accordions>
  ),
  ResponseType: (props) => (
    <Accordion title={props.label}>
      <CodeBlock code={props.code} lang={props.lang} />
    </Accordion>
  ),
  Property,
  ObjectCollapsible,
  Requests: Tabs,
  Request: (props) => (
    <Tab value={props.name}>
      <CodeBlock lang={props.language} code={props.code} />
    </Tab>
  ),
  APIPlayground,
};
