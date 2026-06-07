import { loader } from 'fumadocs-core/source';
import { docs } from 'collections/server';
import { createAsyncAPI } from '@fumadocs/asyncapi/server';

export const asyncapi = createAsyncAPI({
  // input files
  input: ['./scalar.yaml'],
});

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    asyncapi: await asyncapi.staticSource({
      baseDir: 'asyncapi',
    }),
  },
  {
    baseUrl: '/docs',
    plugins: [asyncapi.loaderPlugin()],
  },
);
