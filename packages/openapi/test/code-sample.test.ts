import { describe, expect, test } from 'vitest';
import type { RequestData } from '@/requests/types';
import { defaultAdapters } from '@/requests/media/adapter';
import { pathnameFromRequest } from '@/requests/generators';
import { go } from '@/requests/generators/go';
import { curl } from '@/requests/generators/curl';
import { python } from '@/requests/generators/python';
import { javascript } from '@/requests/generators/javascript';
import { csharp } from '@/requests/generators/csharp';

describe('Code Sample Generators', () => {
  const _data: RequestData = {
    path: {
      test: { value: 'hello_world' },
    },
    body: {
      id: 'id',
    },
    bodyMediaType: 'application/json',
    method: 'get',
    cookie: {
      mode: { value: 'light' },
    },
    header: {
      authorization: { value: 'Bearer' },
    },
    query: {
      search: { values: ['ai'] },
    },
  };

  const data = { ..._data, url: pathnameFromRequest('http://localhost:8080/{test}', _data) };

  const context = {
    mediaAdapters: defaultAdapters,
    custom: null,
  };

  test(`Go`, async () => {
    await expect(go.generate(data, context)).toMatchFileSnapshot(`./out/samples/1.go`);
  });

  test(`Curl`, async () => {
    await expect(curl.generate(data, context)).toMatchFileSnapshot(`./out/samples/1.bash`);
  });

  test(`Python`, async () => {
    await expect(python.generate(data, context)).toMatchFileSnapshot(`./out/samples/1.py`);
  });

  test(`JavaScript`, async () => {
    await expect(javascript.generate(data, context)).toMatchFileSnapshot(`./out/samples/1.js`);
  });

  test(`C#`, async () => {
    await expect(csharp.generate(data, context)).toMatchFileSnapshot(`./out/samples/1.cs`);
  });
});
