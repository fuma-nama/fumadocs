'use client';
import { createGraphQLRenderer } from '@/utils/create-page';
import { GraphQLSchemaView } from '@/ui/schema-ui';
import { Operation } from '@/ui/operation';
import { TypeDocs } from '@/ui/type-docs';

export const GraphQLPage = createGraphQLRenderer({
  // add `playground: { url: 'https://example.com/graphql' }` for the interactive playground
  components: {
    SchemaUI: GraphQLSchemaView,
    Operation,
    TypeDocs,
    Layout({ items }) {
      return (
        <div className="flex flex-col gap-24 text-sm @container">
          {items?.map((item) => item.children)}
        </div>
      );
    },
  },
});
