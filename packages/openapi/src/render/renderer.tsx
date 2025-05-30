import type { ComponentType, ReactNode } from 'react';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import {
  API,
  APIExample,
  APIInfo,
  ObjectCollapsible,
  Property,
  Root,
} from '@/ui';
import type { RenderContext } from '@/types';
import { APIPlayground, type APIPlaygroundProps } from '@/playground';
import { CodeExampleSelector } from '@/ui/lazy';

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
  nested?: boolean;
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
  ctx: RenderContext;
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

export function createRenders(): Renderer {
  return {
    Root,
    API,
    APIInfo: ({ children, head }) => (
      <APIInfo>
        {head}
        {children}
      </APIInfo>
    ),
    APIExample,
    Responses: (props) => (
      <Tabs {...props} groupId="fumadocs_openapi_responses" />
    ),
    Response: Tab,
    ResponseTypes: (props) => (
      <Accordions
        type="single"
        className="pt-2"
        defaultValue={props.defaultValue}
      >
        {props.children}
      </Accordions>
    ),
    ResponseType: (props) => (
      <AccordionItem value={props.label}>
        <AccordionHeader>
          <AccordionTrigger>{props.label}</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="prose-no-margin">
          {props.children}
        </AccordionContent>
      </AccordionItem>
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
