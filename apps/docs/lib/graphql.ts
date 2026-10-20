import { createGraphQL } from '@fumadocs/graphql/server';
import path from 'node:path';

export const graphql = createGraphQL({
  input: { store: path.resolve('./store.graphql') },
  examples: [path.resolve('./graphql-examples/store.graphql')],
  includeSchema: false,
});
