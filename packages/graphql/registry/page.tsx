'use client';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createGraphQLPage } from '@/headless';
import type { RenderContext } from '@/types';
import { GraphQLSchemaView } from '@/ui/schema-ui';
import { Operation } from '@/ui/operation';
import { TypeDocs } from '@/ui/type-docs';

const shiki = defaultShikiFactory;
const shikiOptions = {
  themes: { light: 'github-light', dark: 'github-dark' },
} as const;

/** the options your UI renders with, passed to every operation and type */
const ctx: RenderContext = {
  shiki,
  shikiOptions,
  SchemaUI: GraphQLSchemaView,
  // add `playground: { url: 'https://example.com/graphql' }` for the interactive playground
};

export const GraphQLPage = createGraphQLPage({
  shiki,
  shikiOptions,
  components: {
    SchemaUI: GraphQLSchemaView,
    Operation(props) {
      return <Operation {...props} ctx={ctx} />;
    },
    TypeDocs(props) {
      return <TypeDocs {...props} ctx={ctx} />;
    },
    Layout({ items }) {
      return (
        <div className="flex flex-col gap-24 text-sm @container">
          {items?.map((item) => item.children)}
        </div>
      );
    },
  },
});
