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

  // string bodies are sent as is
  const text = {
    ...data,
    method: 'post',
    body: '  "quoted" """" `${x}` \\ "# \n\ttabbed\t\nends with ""',
    bodyMediaType: 'text/plain',
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
    await expect(generator.generate(text, context)).toMatchFileSnapshot(
      `./out/samples/text.${ext}`,
    );
  });

  test('cURL encodes the body in the format of its media adapter', () => {
    for (const bodyMediaType of [
      'application/merge-patch+json',
      'application/json; charset=utf-8',
    ]) {
      expect(curl.generate({ ...data, bodyMediaType }, context)).toContain(`-d '{\n  "id": "id",`);
    }
  });

  test('form urlencoded bodies send the same fields in every language as the playground', () => {
    const form = {
      ...data,
      method: 'post',
      body: {
        name: 'Rex',
        age: 0,
        vaccinated: false,
        nickname: '',
        owner: null,
        tags: ['a', 'b'],
        meta: { a: 1 },
      },
      bodyMediaType: 'application/x-www-form-urlencoded',
    } satisfies typeof data;
    const encoded =
      'name=Rex&age=0&vaccinated=false&nickname=&tags=a&tags=b&meta=%7B%22a%22%3A1%7D';

    expect(defaultAdapters['application/x-www-form-urlencoded'].encode(form).toString()).toBe(
      encoded,
    );
    for (const generator of [go, curl, python, javascript, csharp, java, rust]) {
      expect(generator.generate(form, context)).toContain(encoded);
    }
  });
});

test('multipart code usages send one part per array item, like the playground', () => {
  const upload: RequestData & { url: string } = {
    method: 'post',
    url: 'https://api.example.com/upload',
    path: {},
    query: {},
    header: {},
    cookie: {},
    body: { name: 'Mars', files: ['@a.jpg', '@b.jpg'], meta: { a: 1 } },
    bodyMediaType: 'multipart/form-data',
  };
  const context = { mediaAdapters: defaultAdapters, custom: null };

  const parts = defaultAdapters['multipart/form-data'].encode({ body: upload.body }) as FormData;
  expect([...parts.entries()]).toEqual([
    ['name', 'Mars'],
    ['files', '@a.jpg'],
    ['files', '@b.jpg'],
    ['meta', '{"a":1}'],
  ]);

  expect(curl.generate(upload, context)).toContain(
    `-F 'files=@a.jpg' \\\n  -F 'files=@b.jpg' \\\n  -F 'meta={"a":1}'`,
  );
  expect(javascript.generate(upload, context)).toContain(
    'body.append("files", "@a.jpg")\nbody.append("files", "@b.jpg")',
  );
  expect(python.generate(upload, context)).toContain(
    '  ("files", (None, "@a.jpg")),\n  ("files", (None, "@b.jpg")),',
  );
  expect(go.generate(upload, context)).toContain(
    'mp.WriteField("files", "@a.jpg")\n  mp.WriteField("files", "@b.jpg")',
  );
  expect(csharp.generate(upload, context)).toContain(
    'body.Add(new StringContent("@a.jpg"), "files");\nbody.Add(new StringContent("@b.jpg"), "files");',
  );
  expect(rust.generate(upload, context)).toContain(
    '.text("files", "@a.jpg")\n    .text("files", "@b.jpg")',
  );
  expect(java.generate(upload, context)).toContain(
    String.raw`name=\"files\"\r\n\r\n@a.jpg\r\n--form-data-boundary\r\nContent-Disposition: form-data; name=\"files\"\r\n\r\n@b.jpg`,
  );
});
