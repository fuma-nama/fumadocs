'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { Schema } from 'shared-api/components/schema';
import type { RenderContext } from '@/types';
import { createAsyncAPIPage } from '@/headless';
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

  const ctx: RenderContext = {
    ...options,
    shikiOptions,
    SchemaUI: (props) => (
      <SchemaComp {...props} showExample={props.showExample ?? schemaUI?.showExample} />
    ),
  };

  const SchemaUI: RenderContext['SchemaUI'] = (props) => {
    if (schemaUI?.render) return schemaUI.render(props, ctx);

    return <ctx.SchemaUI {...props} />;
  };

  return createAsyncAPIPage({
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
