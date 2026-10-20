import { createOpenAPI } from 'fumadocs-openapi/server';
import path from 'node:path';

export const openapi = createOpenAPI({
  input: { scalar: path.resolve('./scalar.yaml') },
  proxyUrl: '/api/proxy',
  includeDocument: false,
});
