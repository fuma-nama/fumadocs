'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { RenderContext } from '@/types';
import { createGraphQLPage as createHeadlessPage, type SchemaViewProps } from '@/headless';
import { Operation } from '@/ui/operation';
import { TypeDocs } from '@/ui/type-docs';
import { GraphQLSchemaView } from '@/ui/schema-ui';
import type { CreateGraphQLPageOptions, GraphQLPageProps } from '.';

/**
 * Create `<GraphQLPage />` (a client component) without the full Shiki bundle.
 */
export function createGraphQLPageBase({
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  schemaUI,
  ...options
}: CreateGraphQLPageOptions & { shiki: ShikiFactory }): FC<GraphQLPageProps> {
  const { shiki, typeLinks, operationLinks, components = {} } = options;
  const {
    Operation: OperationUI = Operation,
    TypeDocs: TypeDocsUI = TypeDocs,
    SchemaUI: SchemaUIComp = GraphQLSchemaView,
  } = components;
  const ctx: RenderContext = {
    ...options,
    shikiOptions,
    SchemaUI: SchemaUIComp,
  };

  return createHeadlessPage({
    shiki,
    shikiOptions,
    typeLinks: typeLinks && ((name) => typeLinks(name, ctx)),
    operationLinks: operationLinks && ((kind, name) => operationLinks(kind, name, ctx)),
    components: {
      ...components,
      SchemaUI(props: SchemaViewProps) {
        if (schemaUI?.render) return schemaUI.render(props, ctx);

        return <SchemaUIComp {...props} />;
      },
      Operation(props) {
        return <OperationUI {...props} ctx={ctx} />;
      },
      TypeDocs(props) {
        return <TypeDocsUI {...props} ctx={ctx} />;
      },
      Layout(props) {
        if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(props, ctx);

        return (
          <div className="flex flex-col gap-24 text-sm @container">
            {props.items?.map((item) => item.children)}
          </div>
        );
      },
    },
  });
}
