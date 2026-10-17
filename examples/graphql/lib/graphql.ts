import { createGraphQL } from '@fumadocs/graphql/server';

export const graphql = createGraphQL({
  // input files
  input: ['./schema.graphql'],
  // example operations, shown on the pages of root fields they select
  examples: ['./examples/store.graphql'],
});
