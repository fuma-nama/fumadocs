'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { Schema } from 'shared-api/components/schema';
import { generate } from '@fumari/json-schema-ts';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { createOpenAPIPage, type OpenAPIRuntime } from '@/utils/create-page';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
} from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
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
  const { Operation: OperationUI = Operation, SchemaUI: SchemaComp = Schema } = components;
  const ctx: RenderContext = { ...options, shikiOptions };

  return createOpenAPIPage({
    shiki,
    shikiOptions,
    codeUsages:
      options.codeUsages ??
      (defaultCodeUsages ??= registerDefault(createCodeUsageGeneratorRegistry())),
    generateCodeSamples: options.generateCodeSamples,
    generateTypeScriptDefinitions:
      options.generateTypeScriptDefinitions ?? defaultTypeScriptDefinitions,
    mediaAdapters: options.mediaAdapters,
    storageKeyPrefix: options.storageKeyPrefix,
    components: {
      ...components,
      SchemaUI: (props) => (
        <SchemaComp {...props} showExample={props.showExample ?? options.schemaUI?.showExample} />
      ),
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

let defaultCodeUsages: CodeUsageGeneratorRegistry | undefined;

const defaultTypeScriptDefinitions: Exclude<
  OpenAPIRuntime['generateTypeScriptDefinitions'],
  false | undefined
> = (schema, ctx) => {
  if (typeof schema !== 'object') return;

  try {
    // `generate` resolves `$ref`s against the schema root itself,
    // spread the bundled document into the root so in-document refs are resolvable
    return generate(
      { ...(ctx.doc.bundled as object), ...getRaw(schema) },
      {
        name: ctx.name,
        readOnly: ctx.readOnly,
        writeOnly: ctx.writeOnly,
      },
    );
  } catch (e) {
    console.warn('Failed to generate typescript schema:', e);
  }
};
