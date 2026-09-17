'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { createPageComponents } from '@fumadocs/api-docs/components/defaults';
import type { RenderContext } from '@/types';
import {
  createGraphQLPage as createHeadlessPage,
  type GraphQLRuntime,
  type SchemaViewProps,
  useGraphQL,
} from '@/headless';
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
  const { components: base, processMarkdown } = createPageComponents({
    shiki,
    shikiOptions,
    components,
  });
  const contexts = new WeakMap<GraphQLRuntime, RenderContext>();

  function getRenderContext(runtime: GraphQLRuntime): RenderContext {
    let ctx = contexts.get(runtime);
    if (!ctx) {
      ctx = {
        ...options,
        shikiOptions,
        schema: { schema: runtime.schema, sdl: runtime.sdl, links: runtime.links },
        SchemaUI: SchemaUIComp,
        _default_processMarkdown: processMarkdown,
      };
      contexts.set(runtime, ctx);
    }

    return ctx;
  }

  function useRenderContext(): RenderContext {
    return getRenderContext(useGraphQL());
  }

  return createHeadlessPage({
    typeLinks: typeLinks && ((name, runtime) => typeLinks(name, getRenderContext(runtime))),
    operationLinks:
      operationLinks &&
      ((kind, name, runtime) => operationLinks(kind, name, getRenderContext(runtime))),
    components: {
      ...base,
      SchemaUI(props: SchemaViewProps) {
        const ctx = useRenderContext();
        if (schemaUI?.render) return schemaUI.render(props, ctx);

        return <SchemaUIComp {...props} />;
      },
      Operation(props) {
        return <OperationUI {...props} ctx={useRenderContext()} />;
      },
      TypeDocs(props) {
        return <TypeDocsUI {...props} ctx={useRenderContext()} />;
      },
      Layout(props) {
        const ctx = useRenderContext();
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
