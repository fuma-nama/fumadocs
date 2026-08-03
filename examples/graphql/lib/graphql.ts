import { createGraphQL } from '@fumadocs/graphql/server';

export const graphql = createGraphQL({
  // input files
  input: ['./schema.graphql'],
});
