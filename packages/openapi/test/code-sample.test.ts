import { describe, expect, test } from 'vitest';
import type { RequestData } from '@/requests/types';
import { defaultAdapters } from '@/requests/media/adapter';
import { pathnameFromRequest } from '@/requests/generators';
import { go } from '@/requests/generators/go';
import { curl } from '@/requests/generators/curl';
import { python } from '@/requests/generators/python';
import { javascript } from '@/requests/generators/javascript';
import { csharp } from '@/requests/generators/csharp';
import { java } from '@/requests/generators/java';
import { rust } from '@/requests/generators/rust';

describe('Code Sample Generators', () => {
  const _data: RequestData = {
    path: {
      test: { value: 'hello_world' },
    },
    body: {
      id: 'id',
      note: 'it\'s "quoted" \\ `a` ${b}',
    },
    bodyMediaType: 'application/json',
    method: 'get',
    cookie: {
      mode: { value: 'light' },
    },
    header: {
      authorization: { value: 'Bearer' },
      'if-none-match': { value: '"etag"' },
    },
    query: {
      search: { values: ['ai'] },
    },
  };

  const data = { ..._data, url: pathnameFromRequest('http://localhost:8080/{test}', _data) };

  const multipart = {
    ...data,
    method: 'post',
    body: { name: 'Mars', image: '@mars.jpg' },
    bodyMediaType: 'multipart/form-data',
  } satisfies typeof data;

  const context = {
    mediaAdapters: defaultAdapters,
    custom: null,
  };

  test.each([
    ['Go', go, 'go'],
    ['cURL', curl, 'bash'],
    ['Python', python, 'py'],
    ['JavaScript', javascript, 'js'],
    ['C#', csharp, 'cs'],
    ['Java', java, 'java'],
    ['Rust', rust, 'rs'],
  ] as const)('%s', async (_, generator, ext) => {
    await expect(generator.generate(data, context)).toMatchFileSnapshot(`./out/samples/1.${ext}`);
    await expect(generator.generate(multipart, context)).toMatchFileSnapshot(
      `./out/samples/multipart.${ext}`,
    );
  });
});
