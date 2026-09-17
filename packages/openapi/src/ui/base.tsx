'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { createPageComponents } from '@fumadocs/api-docs/components/defaults';
import { Schema } from '@fumadocs/api-docs/components/schema';
import { createOpenAPIPage } from '@/headless';
import type { RenderContext } from '@/types';
import { Operation } from '@/ui/operation';
import type { CreateOpenAPIPageOptions, OpenAPIPageProps } from '.';

/**
 * Create `<OpenAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createOpenAPIPageBase(
  options: CreateOpenAPIPageOptions & { shiki: ShikiFactory },
): FC<OpenAPIPageProps> {
  const {
    shiki,
    shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
    components = {},
  } = options;
  const { Operation: OperationUI = Operation, SchemaUI = Schema } = components;
  const {
    components: base,
    renderMarkdown,
    renderCodeblock,
  } = createPageComponents({ shiki, shikiOptions, components });
  const ctx: RenderContext = { ...options, shikiOptions };

  return createOpenAPIPage({
    codeUsages: options.codeUsages,
    generateCodeSamples: options.generateCodeSamples,
    generateTypeScriptDefinitions: options.generateTypeScriptDefinitions,
    mediaAdapters: options.mediaAdapters,
    storageKeyPrefix: options.storageKeyPrefix,
    components: {
      ...base,
      SchemaUI(props) {
        return (
          <SchemaUI
            renderMarkdown={renderMarkdown}
            renderCodeblock={renderCodeblock}
            {...props}
            showExample={props.showExample ?? options.schemaUI?.showExample}
          />
        );
      },
      Operation(props) {
        return <OperationUI {...props} ctx={ctx} />;
      },
      Layout(props) {
        if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(props, ctx);

        return (
          <div className="flex flex-col gap-24 text-sm @container">
            {props.operations?.map((item) => item.children)}
            {props.webhooks?.map((item) => item.children)}
          </div>
        );
      },
    },
  });
}
