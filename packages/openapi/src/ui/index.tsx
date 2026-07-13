'use client';
import type {
  Awaitable,
  Document,
  HttpMethods,
  OperationObject,
  PathItemObject,
  RenderContext,
} from '@/types';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { ComponentProps, FC, HTMLAttributes, ReactNode } from 'react';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { CodeUsageGeneratorRegistry, InlineCodeUsageGenerator } from '@/requests/generators';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { CodeToHastOptionsCommon, CodeOptionsThemes, BundledTheme } from 'shiki';
import type { ExampleRequestItem } from '../utils/get-example-requests';
import type { RequestTabsRenderOptions } from './operation/request-tabs';
import type { ResponseTabsRenderOptions } from './operation/response-tabs';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { GeneratedPageProps, WebhookItem, OperationItem } from '@/utils/pages/builder';
import type { ParsedSchema } from '@/utils/schema';
import { createOpenAPIPageBase } from './base';

export interface GenerateTypeScriptDefinitionsContext {
  name: string;
  readOnly: boolean;
  writeOnly: boolean;
  ctx: RenderContext;
}

export interface APIPlaygroundProps {
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;
  ctx: RenderContext;
}

export interface CreateOpenAPIPageOptions {
  /**
   * Generate TypeScript definitions from JSON schema.
   *
   * Pass `false` to disable it.
   */
  generateTypeScriptDefinitions?:
    | ((
        schema: ParsedSchema,
        ctx: GenerateTypeScriptDefinitionsContext,
      ) => Awaitable<string | undefined>)
    | false;

  /**
   * Generate example code usage for all endpoints.
   */
  codeUsages?: CodeUsageGeneratorRegistry;

  /**
   * Generate example code usage for each endpoint.
   */
  generateCodeSamples?: (options: {
    operation: OperationObject;
    method: HttpMethods;
    pathItem: PathItemObject;
  }) => InlineCodeUsageGenerator[];

  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

  /**
   * Show full response schema instead of only example response & Typescript definitions.
   *
   * @default true
   */
  showResponseSchema?: boolean;

  /**
   * Support other media types.
   */
  mediaAdapters?: Record<string, MediaAdapter>;

  /**
   * Customize page content.
   */
  content?: {
    renderResponseTabs?: (options: ResponseTabsRenderOptions, ctx: RenderContext) => ReactNode;

    renderRequestTabs?: (options: RequestTabsRenderOptions, ctx: RenderContext) => ReactNode;

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
    render?: (
      options: {
        root: ParsedSchema;
        readOnly?: boolean;
        writeOnly?: boolean;
      },
      ctx: RenderContext,
    ) => ReactNode;

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
  playground?: PlaygroundClientOptions & {
    /**
     * @defaultValue true
     */
    enabled?: boolean;

    /**
     * render a page-level provider (useful for handling auth)
     */
    provider?: (props: { children: ReactNode }) => ReactNode;
    /**
     * replace the renderer
     */
    render?: (props: APIPlaygroundProps) => ReactNode;
  };

  operation?: {
    APIExampleSelector?: FC<{
      items: ExampleRequestItem[];

      value: string | undefined;
      onValueChange: (id: string) => void;
    }>;
  };

  components?: {
    Heading?: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
    CodeBlock?: FC<{ lang: string; code: string }>;
    Markdown?: FC<{ md: string }>;
  };

  /**
   * Set a prefix for `localStorage` keys.
   *
   * Useful when using multiple OpenAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-openapi-`
   */
  storageKeyPrefix?: string;

  /** @deprecated use `components.Heading` instead */
  renderHeading?: (props: HTMLAttributes<HTMLHeadingElement>, depth: number) => ReactNode;
  /** @deprecated use `components.CodeBlock` instead */
  renderCodeBlock?: (props: { lang: string; code: string }) => ReactNode;
  /** @deprecated use `components.Markdown` instead */
  renderMarkdown?: (md: string) => ReactNode;
}

export type OpenAPIPageProps = OpenAPIPageProps_Spec | OpenAPIPageProps_Preloaded;

export type OpenAPIPageProps_Spec = Omit<GeneratedPageProps, 'document'> & {
  payload: {
    bundled: Document;
    proxyUrl?: string;
  };
};

export type OpenAPIPageProps_Preloaded = GeneratedPageProps & {
  preloaded: {
    docs: Record<string, Document>;
    proxyUrl?: string;
  };
};

/**
 * Create `<OpenAPIPage />` (a client component).
 */
export function createOpenAPIPage(options: CreateOpenAPIPageOptions = {}): FC<OpenAPIPageProps> {
  return createOpenAPIPageBase({
    ...options,
    shiki: options.shiki ?? defaultShikiFactory,
  });
}

/** @deprecated Use `OpenAPIPageProps` instead */
export type ApiPageProps = OpenAPIPageProps;
// kept for backward compatibility
export type { OperationItem, WebhookItem } from '@/utils/pages/builder';
