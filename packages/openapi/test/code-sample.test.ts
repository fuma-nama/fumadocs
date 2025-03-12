import { describe, expect, test } from 'vitest';
import * as Python from '@/requests/python';
import * as Go from '@/requests/go';
import * as Curl from '@/requests/curl';
import * as JS from '@/requests/javascript';
import type { RequestData } from '@/requests/_shared';

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

  test(`Go`, async () => {
    await expect(Go.getSampleRequest(url, data)).toMatchFileSnapshot(
      `./out/samples/1.go`,
    );
  });

  test(`Curl`, async () => {
    await expect(Curl.getSampleRequest(url, data)).toMatchFileSnapshot(
      `./out/samples/1.bash`,
    );
  });

  test(`Python`, async () => {
    await expect(Python.getSampleRequest(url, data)).toMatchFileSnapshot(
      `./out/samples/1.py`,
    );
  });

  test(`JavaScript`, async () => {
    await expect(JS.getSampleRequest(url, data)).toMatchFileSnapshot(
      `./out/samples/1.js`,
    );
  });
});
