'use client';
import type { ComponentProps, FC, ReactNode } from 'react';
import { Schema } from 'shared-api/components/schema';
import { createAsyncAPIPage as createHeadlessPage } from '@/utils/create-page';
import { Operation } from '@/ui/operation';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { BundledTheme, CodeOptionsThemes, CodeToHastOptionsCommon } from 'shiki';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import type { OperationObject, RenderContext } from '@/types';
import type { JsonSchema } from '@fumadocs/json-schema';
import type { ExampleMessageItem } from '@/utils/get-example-messages';
import type { OperationItem } from '@/utils/pages/builder';
import type {
  AsyncAPIPageProps,
  AsyncAPIPageProps_Preloaded,
  AsyncAPIPageProps_Spec,
} from '@/utils/create-page';
import type { OperationProps } from './operation';

export type { AsyncAPIPageProps, AsyncAPIPageProps_Spec, AsyncAPIPageProps_Preloaded };

export interface CreateAsyncAPIPageOptions {
  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;
  content?: {
    renderPageLayout?: (
      slots: {
        operations?: {
          item: OperationItem;
          children: ReactNode;
        }[];
      },
      ctx: RenderContext,
    ) => ReactNode;
    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        server: ReactNode;
        channel: ReactNode;
        authSchemes: ReactNode;
        parameters: ReactNode;
        messages: ReactNode;
        reply: ReactNode;
        bindings: ReactNode;
      },
      context: {
        operation: OperationObject;
        action: 'send' | 'receive';
        ctx: RenderContext;
      },
    ) => ReactNode;
    renderAPIExampleLayout?: (
      slots: {
        selector: ReactNode;
        usageTabs: ReactNode;
        responseTabs: ReactNode;
      },
      ctx: RenderContext,
    ) => ReactNode;
    renderAPIExampleUsageTabs?: (items: ExampleMessageItem[], ctx: RenderContext) => ReactNode;
  };
  schemaUI?: {
    render?: (
      options: {
        root: JsonSchema;
        readOnly?: boolean;
        writeOnly?: boolean;
      },
      ctx: RenderContext,
    ) => ReactNode;
    showExample?: boolean;
  };
  components?: {
    Heading?: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
    CodeBlock?: FC<{ lang: string; code: string }>;
    Markdown?: FC<{ md: string }>;
    /**
     * Replace the Schema UI, e.g. the one installed with Fumadocs CLI.
     */
    SchemaUI?: FC<SchemaUIOptions>;
    /**
     * Replace the UI of operations, e.g. the one installed with Fumadocs CLI.
     */
    Operation?: FC<OperationProps>;
  };
  storageKeyPrefix?: string;
}

/**
 * Create `<AsyncAPIPage />` (a client component).
 */
export function createAsyncAPIPage(options: CreateAsyncAPIPageOptions = {}): FC<AsyncAPIPageProps> {
  const {
    shiki = defaultShikiFactory,
    shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
    schemaUI,
    components = {},
  } = options;
  const { Operation: OperationUI = Operation, SchemaUI: SchemaComp = Schema } = components;

  const ctx: RenderContext = {
    ...options,
    shiki,
    shikiOptions,
    SchemaUI: (props) => (
      <SchemaComp {...props} showExample={props.showExample ?? schemaUI?.showExample} />
    ),
  };

  const SchemaUI: RenderContext['SchemaUI'] = (props) => {
    if (schemaUI?.render) return schemaUI.render(props, ctx);

    return <ctx.SchemaUI {...props} />;
  };

  return createHeadlessPage({
    shiki,
    shikiOptions,
    storageKeyPrefix: options.storageKeyPrefix,
    components: {
      ...components,
      SchemaUI,
      Operation(props) {
        return <OperationUI {...props} ctx={ctx} />;
      },
      Layout(props) {
        if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(props, ctx);

        return (
          <div className="flex flex-col gap-24 text-sm @container">
            {props.operations?.map((item) => item.children)}
          </div>
        );
      },
    },
  });
}
