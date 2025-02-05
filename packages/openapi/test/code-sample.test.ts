import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import * as Python from '@/requests/python';
import * as Go from '@/requests/go';
import * as Curl from '@/requests/curl';
import * as JS from '@/requests/javascript';
import { generateSample } from '@/utils/generate-sample';
import { createMethod } from '@/server/create-method';
import { methodKeys } from '@/build-routes';
import { getContext } from '@/server/api-page';
import { processDocument } from '@/utils/process-document';

const example = fileURLToPath(
  new URL('./fixtures/petstore.yaml', import.meta.url),
);

const processed = await processDocument(example, true);
processed.document.servers = [
  {
    url: 'http://localhost:8080',
  },
];
const ctx = await getContext(processed, {
  shikiOptions: {
    theme: 'vitesse-dark',
  },
});

const { document } = processed;

describe('Code Sample Generators', () => {
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    if (!item) continue;

    for (const method of methodKeys) {
      const operation = item[method];
      if (!operation) continue;

      const info = createMethod(method, item, operation);
      const endpoint = generateSample(path, info, ctx);

      test(`Go: ${method} ${path}`, async () => {
        await expect(
          Go.getSampleRequest(
            endpoint,
            Object.keys(endpoint.body?.samples ?? {})[0],
          ),
        ).toMatchFileSnapshot(`./out/samples/${path}/${method}.go`);
      });

      test(`Curl: ${method} ${path}`, async () => {
        await expect(
          Curl.getSampleRequest(
            endpoint,
            Object.keys(endpoint.body?.samples ?? {})[0],
          ),
        ).toMatchFileSnapshot(`./out/samples/${path}/${method}.bash`);
      });

      test(`Python: ${method} ${path}`, async () => {
        await expect(
          Python.getSampleRequest(
            endpoint,
            Object.keys(endpoint.body?.samples ?? {})[0],
          ),
        ).toMatchFileSnapshot(`./out/samples/${path}/${method}.py`);
      });

      test(`JavaScript: ${method} ${path}`, async () => {
        await expect(
          JS.getSampleRequest(
            endpoint,
            Object.keys(endpoint.body?.samples ?? {})[0],
          ),
        ).toMatchFileSnapshot(`./out/samples/${path}/${method}.js`);
      });
    }
  }
});
