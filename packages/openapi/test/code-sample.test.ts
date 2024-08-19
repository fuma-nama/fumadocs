import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import Parser from '@apidevtools/json-schema-ref-parser';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import Slugger from 'github-slugger';
import * as Python from '@/requests/python';
import * as Go from '@/requests/go';
import * as Curl from '@/requests/curl';
import * as JS from '@/requests/javascript';
import { generateSample } from '@/schema/sample';
import { createMethod } from '@/schema/method';
import { methodKeys } from '@/build-routes';
import { defaultRenderer } from '@/render/renderer';
import { type RenderContext } from '@/types';

const example = fileURLToPath(
  new URL('./fixtures/petstore.yaml', import.meta.url),
);
const document = await Parser.dereference<OpenAPI.Document>(example);

const ctx: RenderContext = {
  baseUrl: 'http://localhost:8080',
  document,
  renderer: defaultRenderer,
  slugger: new Slugger(),
};

describe('Code Sample Generators', () => {
  for (const [path, item] of Object.entries(document.paths)) {
    if (!item) continue;

    for (const method of methodKeys) {
      const operation = item[method];
      if (!operation) continue;

      const info = createMethod(method, item, operation);
      const endpoint = generateSample(path, info, ctx);

      test(`Go: ${method} ${path}`, async () => {
        await expect(Go.getSampleRequest(endpoint)).toMatchFileSnapshot(
          `./out/samples/${path}/${method}.go`,
        );
      });

      test(`Curl: ${method} ${path}`, async () => {
        await expect(Curl.getSampleRequest(endpoint)).toMatchFileSnapshot(
          `./out/samples/${path}/${method}.bash`,
        );
      });

      test(`Python: ${method} ${path}`, async () => {
        await expect(Python.getSampleRequest(endpoint)).toMatchFileSnapshot(
          `./out/samples/${path}/${method}.py`,
        );
      });

      test(`JavaScript: ${method} ${path}`, async () => {
        await expect(JS.getSampleRequest(endpoint)).toMatchFileSnapshot(
          `./out/samples/${path}/${method}.js`,
        );
      });
    }
  }
});
