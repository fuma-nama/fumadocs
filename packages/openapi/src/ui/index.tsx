'use client';
import type { FC, ReactNode } from 'react';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { CodeToHastOptionsCommon, CodeOptionsThemes, BundledTheme } from 'shiki';
import type { SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import type { HttpMethods, OperationObject, PathItemObject, RenderContext } from '@/types';
import type { CodeUsageGeneratorRegistry } from '@/requests/generators';
import type { ExampleRequestItem } from '@/utils/get-example-requests';
import type {
  OpenAPIPageProps,
  OpenAPIPageProps_Preloaded,
  OpenAPIPageProps_Spec,
  OperationItem,
  WebhookItem,
} from '@/utils/pages/builder';
import type { OpenAPIComponents, OpenAPIRuntime, ResponseTab } from '@/headless';
import type { OperationPlaygroundOptions, OperationProps } from './operation';
import { createOpenAPIPageBase } from './base';

export type { APIPlaygroundProps } from './operation';
export type { GenerateTypeScriptDefinitionsContext } from '@/headless/runtime';
export type { OpenAPIPageProps, OpenAPIPageProps_Spec, OpenAPIPageProps_Preloaded };

export interface CreateOpenAPIPageOptions extends Partial<
  Omit<OpenAPIRuntime, 'doc' | 'proxyUrl'>
> {
  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

  /**
   * Show full response schema instead of only example response & Typescript definitions.
   *
   * @default true
   */
  showResponseSchema?: boolean;

  /**
   * Customize page content.
   */
  content?: {
    renderResponseTabs?: (options: { tabs: ResponseTab[] }, ctx: RenderContext) => ReactNode;

    renderRequestTabs?: (
      options: {
        route: string;
        items: ExampleRequestItem[];
        method: HttpMethods;
        pathItem: PathItemObject;
        operation: OperationObject;
      },
      ctx: RenderContext,
    ) => ReactNode;

    renderAPIExampleLayout?: (
      slots: {
        selector: ReactNode;
        usageTabs: ReactNode;
        responseTabs: ReactNode;
      },
      ctx: RenderContext,
    ) => ReactNode;

    /**
     * @param generators - codegens for API example usages
     */
    renderAPIExampleUsageTabs?: (
      generators: CodeUsageGeneratorRegistry,
      ctx: RenderContext,
    ) => ReactNode;

    /**
     * renderer of the entire page's layout (containing all operations & webhooks UI)
     */
    renderPageLayout?: (
      slots: {
        operations?: {
          item: OperationItem;
          children: ReactNode;
        }[];
        webhooks?: {
          item: WebhookItem;
          children: ReactNode;
        }[];
      },
      ctx: RenderContext,
    ) => ReactNode;

    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        apiExample: ReactNode;
        apiPlayground: ReactNode;

        authSchemes: ReactNode;
        parameters: ReactNode;
        body: ReactNode;
        responses: ReactNode;
        callbacks: ReactNode;
      },
      context: {
        path: string;
        operation: OperationObject;
        method: HttpMethods;
        pathItem: PathItemObject;
        ctx: RenderContext;
      },
    ) => ReactNode;

    renderWebhookLayout?: (slots: {
      header: ReactNode;
      description: ReactNode;
      authSchemes: ReactNode;
      parameters: ReactNode;
      body: ReactNode;
      requests: ReactNode;
      responses: ReactNode;
      callbacks: ReactNode;
    }) => ReactNode;
  };

  /**
   * Info UI for JSON schemas.
   */
  schemaUI?: {
    /**
     * Show examples under the generated content of JSON schemas.
     *
     * @defaultValue false
     */
    showExample?: boolean;
  };

  /**
   * Customize API playground.
   */
  playground?: OperationPlaygroundOptions;

  components?: Partial<Omit<OpenAPIComponents, 'SchemaUI'>> & {
    /**
     * Replace the Schema UI, e.g. the one installed with Fumadocs CLI.
     */
    SchemaUI?: FC<SchemaUIOptions>;
    /**
     * Replace the UI of operations and webhooks, e.g. the one installed with Fumadocs CLI.
     */
    Operation?: FC<OperationProps>;
  };
}

/**
 * Create `<OpenAPIPage />` (a client component).
 */
export function createOpenAPIPage(options: CreateOpenAPIPageOptions = {}): FC<OpenAPIPageProps> {
  return createOpenAPIPageBase({
    ...options,
    shiki: options.shiki ?? defaultShikiFactory,
  });
}
