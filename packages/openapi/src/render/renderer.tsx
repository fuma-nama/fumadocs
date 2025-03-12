import type { ComponentType, ReactNode } from 'react';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import {
  API,
  Root,
  APIInfo,
  APIExample,
  Property,
  ObjectCollapsible,
} from '@/ui';
import type { RenderContext, ServerObject } from '@/types';
import { APIPlayground, type APIPlaygroundProps } from '@/playground';
import { CodeExampleSelector } from '@/ui/contexts/code-example.lazy';

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

  head: ReactNode;
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
  name: string;

  children: ReactNode;
}

export interface SamplesProps {
  items: {
    title: string;
    description?: ReactNode;
    value: string;
  }[];
}

export interface ResponseTypeProps {
  label: string;
  children: ReactNode;
}

export interface RootProps {
  baseUrl?: string;
  shikiOptions?: RenderContext['shikiOptions'];

  servers: ServerObject[];
  children: ReactNode;
}

export interface Renderer {
  Root: ComponentType<RootProps>;
  API: ComponentType<{ children: ReactNode }>;
  APIInfo: ComponentType<APIInfoProps>;
  APIExample: ComponentType<{ children: ReactNode }>;

  Responses: ComponentType<ResponsesProps>;
  Response: ComponentType<ResponseProps>;
  CodeExampleSelector: ComponentType<SamplesProps>;
  Requests: ComponentType<{ items: string[]; children: ReactNode }>;
  Request: ComponentType<RequestProps>;
  ResponseTypes: ComponentType<{ defaultValue?: string; children: ReactNode }>;
  ResponseType: ComponentType<ResponseTypeProps>;

  /**
   * Collapsible to show object schemas
   */
  ObjectCollapsible: ComponentType<ObjectCollapsibleProps>;
  Property: ComponentType<PropertyProps>;
  APIPlayground: ComponentType<APIPlaygroundProps>;
}

export function createRenders(
  shikiOptions: RenderContext['shikiOptions'],
): Renderer {
  return {
    Root: (props) => (
      <Root shikiOptions={shikiOptions} {...props}>
        {props.children}
      </Root>
    ),
    API,
    APIInfo: ({ children, head }) => (
      <APIInfo>
        {head}
        {children}
      </APIInfo>
    ),
    APIExample,
    Responses: Tabs,
    Response: Tab,
    ResponseTypes: (props) => (
      <Accordions
        type="single"
        className="!-m-4 border-none pt-2"
        defaultValue={props.defaultValue}
      >
        {props.children}
      </Accordions>
    ),
    ResponseType: (props) => (
      <Accordion title={props.label}>{props.children}</Accordion>
    ),
    Property,
    ObjectCollapsible,
    Requests: (props) => (
      <Tabs groupId="fumadocs_openapi_requests" {...props} />
    ),

    CodeExampleSelector,
    Request: (props) => <Tab value={props.name}>{props.children}</Tab>,
    APIPlayground,
  };
}
