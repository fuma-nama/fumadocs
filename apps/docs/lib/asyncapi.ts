import { createAsyncAPI } from '@fumadocs/asyncapi/server';
import path from 'node:path';

export const asyncapi = createAsyncAPI({
  input: { scalar: path.resolve('./scalar-asyncapi.yaml') },
  includeDocument: false,
});
