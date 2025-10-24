import { describe, expect, test } from 'vitest';
import * as Python from '@/requests/generators/python';
import * as Go from '@/requests/generators/go';
import * as Curl from '@/requests/generators/curl';
import * as JS from '@/requests/generators/javascript';
import type { RequestData } from '@/requests/types';
import { defaultAdapters } from '@/requests/media/adapter';
import { resolveRequestData } from '@/utils/url';

describe('Code Sample Generators', () => {
  const data: RequestData = {
    path: {
      test: { value: 'hello_world' },
    },
    body: {
      id: 'id',
    },
    bodyMediaType: 'application/json',
    method: 'GET',
    cookie: {
      mode: { value: 'light' },
    },
    header: {
      authorization: { value: 'Bearer' },
    },
    query: {
      search: { value: 'ai' },
    },
  };
  const url = resolveRequestData('http://localhost:8080/{test}', data);

  const context = {
    mediaAdapters: defaultAdapters,
    server: null,
  };

  test(`Go`, async () => {
    await expect(Go.generator(url, data, context)).toMatchFileSnapshot(
      `./out/samples/1.go`,
    );
  });

  test(`Curl`, async () => {
    await expect(Curl.generator(url, data, context)).toMatchFileSnapshot(
      `./out/samples/1.bash`,
    );
  });

  test(`Python`, async () => {
    await expect(Python.generator(url, data, context)).toMatchFileSnapshot(
      `./out/samples/1.py`,
    );
  });

  test(`JavaScript`, async () => {
    await expect(JS.generator(url, data, context)).toMatchFileSnapshot(
      `./out/samples/1.js`,
    );
  });
});
