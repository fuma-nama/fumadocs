'use client';
import { getNamedTypeKind, type NamedTypeKind } from '@fumadocs/graphql';
import { createGraphQLPage } from '@fumadocs/graphql/ui';

const kindToFolder: Record<NamedTypeKind, string> = {
  object: 'objects',
  interface: 'interfaces',
  union: 'unions',
  enum: 'enums',
  input: 'inputs',
  scalar: 'scalars',
};

export const GraphQLPage = createGraphQLPage({
  typeLinks(name, ctx) {
    const type = ctx.schema.schema.getType(name);
    if (!type) return;

    return `/docs/${kindToFolder[getNamedTypeKind(type)]}/${name}`;
  },
  playground: {
    url: '/api/graphql',
  },
});
