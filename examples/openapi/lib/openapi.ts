import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  // input files
  input: ['./openapi.json'],
});
