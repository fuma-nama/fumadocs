'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { Schema } from 'shared-api/components/schema';
import { generate } from '@fumari/json-schema-ts';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import {
  createOpenAPIBaseRenderer,
  type OpenAPIRuntime,
  type PageLayoutProps,
} from '@/utils/create-page';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
} from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
import { Operation } from '@/ui/operation';
import type { CreateOpenAPIPageOptions, OpenAPIPageProps } from '.';

/**
 * Create `<OpenAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createOpenAPIPageBase(
  options: CreateOpenAPIPageOptions & { shiki: ShikiFactory },
): FC<OpenAPIPageProps> {
  return createOpenAPIBaseRenderer({
    ...options,
    codeUsages:
      options.codeUsages ??
      (defaultCodeUsages ??= registerDefault(createCodeUsageGeneratorRegistry())),
    generateTypeScriptDefinitions:
      options.generateTypeScriptDefinitions ?? defaultTypeScriptDefinitions,
    components: { SchemaUI: Schema, Operation, Layout, ...options.components },
  });
}

function Layout({ operations, webhooks }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-24 text-sm @container">
      {operations?.map((item) => item.children)}
      {webhooks?.map((item) => item.children)}
    </div>
  );
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
