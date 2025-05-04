import { describe, expect, test } from 'vitest';
import * as Python from '@/requests/python';
import * as Go from '@/requests/go';
import * as Curl from '@/requests/curl';
import * as JS from '@/requests/javascript';
import type { RequestData } from '@/requests/_shared';
import { defaultAdapters } from '@/media/adapter';

describe('Code Sample Generators', () => {
  const url = 'http://localhost:8080/{test}';
  const data: RequestData = {
    path: {
      test: 'hello_world',
    },
    body: {
      id: 'id',
    },
    bodyMediaType: 'application/json',
    method: 'GET',
    cookie: {
      mode: 'light',
    },
    header: {
      authorization: 'Bearer',
    },
    query: {
      search: 'ai',
    },
  };

  const context = {
    mediaAdapters: defaultAdapters,
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
