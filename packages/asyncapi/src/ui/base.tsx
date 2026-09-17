'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { createPageComponents } from '@fumadocs/api-docs/components/defaults';
import { Schema } from '@fumadocs/api-docs/components/schema';
import type { RenderContext } from '@/types';
import { type AsyncAPIRuntime, createAsyncAPIPage, useAsyncAPI } from '@/headless';
import { Operation } from '@/ui/operation';
import type { AsyncAPIPageProps, CreateAsyncAPIPageOptions } from '.';

/**
 * Create `<AsyncAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createAsyncAPIPageBase(
  options: CreateAsyncAPIPageOptions & { shiki: ShikiFactory },
): FC<AsyncAPIPageProps> {
  const {
    shiki,
    shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
    schemaUI,
    components = {},
  } = options;
  const { Operation: OperationUI = Operation, SchemaUI: SchemaComp = Schema } = components;
  const {
    components: base,
    processMarkdown,
    renderMarkdown,
    renderCodeblock,
  } = createPageComponents({
    shiki,
    shikiOptions,
    components,
  });
  const contexts = new WeakMap<AsyncAPIRuntime, RenderContext>();

  const SchemaUI: RenderContext['SchemaUI'] = (props) => {
    const ctx = useRenderContext();
    if (schemaUI?.render) return schemaUI.render(props, ctx);

    return (
      <SchemaComp
        renderMarkdown={renderMarkdown}
        renderCodeblock={renderCodeblock}
        {...props}
        showExample={props.showExample ?? schemaUI?.showExample}
      />
    );
  };

  /** the render context of a runtime, created on demand */
  function useRenderContext(): RenderContext {
    const runtime = useAsyncAPI();
    let ctx = contexts.get(runtime);
    if (!ctx) {
      ctx = {
        ...options,
        shikiOptions,
        schema: runtime.doc,
        storageKeyPrefix: runtime.storageKeyPrefix,
        SchemaUI,
        _default_processMarkdown: processMarkdown,
      };
      contexts.set(runtime, ctx);
    }

    return ctx;
  }

  return createAsyncAPIPage({
    storageKeyPrefix: options.storageKeyPrefix,
    components: {
      ...base,
      SchemaUI,
      Operation(props) {
        return <OperationUI {...props} ctx={useRenderContext()} />;
      },
      Layout(props) {
        const ctx = useRenderContext();
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
