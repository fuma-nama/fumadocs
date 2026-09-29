import { createGraphQL } from '@fumadocs/graphql/server';
import path from 'node:path';

export const graphql = createGraphQL({
  input: [path.resolve('./store.graphql')],
});
