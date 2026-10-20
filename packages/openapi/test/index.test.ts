import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { generateFiles, generateFilesOnly, type OutputFile } from '@/generate-file';
import { createOpenAPI } from '@/server';
import path from 'node:path';
import { loader } from 'fumadocs-core/source';

const cwd = fileURLToPath(new URL('./', import.meta.url));

describe('Generate documents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Pet Store (Per Operation)', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          petstore: path.join(cwd, './fixtures/petstore.yaml'),
        },
      }),
      per: 'operation',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/petstore-per-operation.md');
  });

  test('Museum (Per Tag)', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          museum: path.join(cwd, './fixtures/museum.yaml'),
        },
      }),
      per: 'tag',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/museum-per-tag.md');
  });

  test('Unkey (Per File)', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          unkey: path.join(cwd, './fixtures/unkey.json'),
        },
      }),
      per: 'file',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/unkey-per-file.md');
  });

  test('Generate Files', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          museum: path.join(cwd, './fixtures/museum.yaml'),
          petstore: path.join(cwd, './fixtures/petstore.yaml'),
        },
      }),
      per: 'file',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/museum+petstore.md');
  });

  test('Generate Files - throws error when no input files found', async () => {
    await expect(
      generateFilesOnly({
        input: createOpenAPI({
          input: [path.join(cwd, './fixtures/non-existent.yaml')],
        }),
        per: 'file',
      }),
    ).rejects.toThrowError();
  });

  test('Generate Files - groupBy tag per operation', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          products: path.join(cwd, './fixtures/products.yaml'),
        },
      }),
      per: 'operation',
      groupBy: 'tag',
      name: {
        algorithm: 'v1',
      },
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/products-group-by-tag.md');
  });

  test('Generate Files - groupBy tag with tag hierarchy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          store: path.join(cwd, './fixtures/tag-hierarchy.yaml'),
        },
      }),
      per: 'operation',
      groupBy: 'tag',
      meta: true,
    });

    expect(warn).toHaveBeenCalledOnce();
    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/tag-hierarchy.md');
  });

  test('Generate Files - per tag with `x-tagGroups`', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          example: {
            openapi: '3.1.0',
            info: { title: 'Example', version: '1.0.0' },
            tags: [{ name: 'Contexts' }, { name: 'Submissions' }, { name: 'VAT' }],
            'x-tagGroups': [
              { name: 'KSeF', tags: ['Contexts', 'Submissions'] },
              { name: 'Verification', tags: ['VAT'] },
            ],
            paths: {
              '/ksef/contexts': { get: { tags: ['Contexts'], summary: 'List contexts' } },
              '/ksef/submissions': {
                post: { tags: ['Submissions'], summary: 'Submit an invoice' },
              },
              '/vat/{taxId}': { get: { tags: ['VAT'], summary: 'Verify a VAT number' } },
            },
          } as never,
        },
      }),
      per: 'tag',
      meta: true,
    });

    expect(out.map((file) => file.path).sort()).toEqual([
      'ksef/contexts.mdx',
      'ksef/meta.json',
      'ksef/submissions.mdx',
      'meta.json',
      'verification/meta.json',
      'verification/vat.mdx',
    ]);
  });

  test('Generate Files - per tag with tag hierarchy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          store: {
            openapi: '3.2.0',
            info: { title: 'Store API', version: '1.0.0' },
            tags: [
              { name: 'store', summary: 'Store' },
              { name: 'products', parent: 'store' },
              { name: 'beta', kind: 'badge' },
            ],
            paths: {
              '/store': { get: { operationId: 'getStore', tags: ['store'] } },
              '/products': {
                get: { operationId: 'listProducts', tags: ['products', 'products', 'beta'] },
              },
              '/orders': { get: { operationId: 'listOrders', tags: ['orders'] } },
              '/health': { get: { operationId: 'healthCheck', tags: ['beta'] } },
            },
          },
        },
      }),
      per: 'tag',
      meta: true,
    });
    const content = (file: string) => out.find((item) => item.path === file)?.content ?? '';

    expect(warn).toHaveBeenCalledOnce();
    expect(out.map((file) => file.path).sort()).toEqual([
      'meta.json',
      'orders.mdx',
      'store/meta.json',
      'store/products.mdx',
      'store/store.mdx',
      'unknown.mdx',
    ]);
    expect(JSON.parse(content('meta.json'))).toEqual({ pages: ['store', 'orders', 'unknown'] });
    expect(JSON.parse(content('store/meta.json'))).toEqual({
      title: 'Store',
      pages: ['store', 'products'],
    });
    // listed once, despite the repeated tag
    expect(content('store/products.mdx')).toContain(
      'operations={[{"path":"/products","method":"get"}]}',
    );
  });

  test('Generate Files - with index', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          products: path.join(cwd, './fixtures/products.yaml'),
        },
      }),
      per: 'operation',
      name: {
        algorithm: 'v1',
      },
      index: {
        url: {
          baseUrl: '/docs',
          contentDir: '',
        },
        items: [
          {
            description: 'all available pages',
            path: 'index.mdx',
            only: ['products'],
          },
        ],
      },
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/products-with-index.md');
  });

  test('Generate Files - with index of pages in folders', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          store: path.join(cwd, './fixtures/tag-hierarchy.yaml'),
        },
      }),
      per: 'tag',
      index: {
        url: { baseUrl: '/docs', contentDir: '' },
        items: [{ path: 'index' }],
      },
    });

    const index = out.find((file) => file.path === 'index.mdx')?.content;
    expect(index).toContain('<Card href="/docs/store/products" ');
    expect(index).toContain('<Card href="/docs/store/inventory" ');
    expect(index).toContain('<Card href="/docs/unknown" ');
  });

  test('Generate Files - with meta', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          products: path.join(cwd, './fixtures/products.yaml'),
        },
      }),
      per: 'operation',
      meta: true,
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/products-with-meta.md');
  });

  test('Generate Files - with meta + groupBy', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          products: path.join(cwd, './fixtures/products.yaml'),
        },
      }),
      per: 'operation',
      groupBy: 'tag',
      meta: true,
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot('./out/products-with-meta+groupby.md');
  });

  test('Generate Files - with imports', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          petstore: path.join(cwd, './fixtures/petstore.yaml'),
        },
      }),
      per: 'file',
      imports: [
        { names: ['API_BASE_URL'], from: '@/constants' },
        { names: ['Foo', 'Bar'], from: '@/components' },
      ],
    });

    expect(out.length).toBeGreaterThan(0);
    for (const file of out) {
      // each import is a single line, in the order they were given
      expect(file.content).toContain(
        'import { API_BASE_URL } from "@/constants";\nimport { Foo, Bar } from "@/components";',
      );
    }
  });

  test('Generate Files - with empty imports', async () => {
    const options = {
      input: createOpenAPI({
        input: {
          petstore: path.join(cwd, './fixtures/petstore.yaml'),
        },
      }),
      per: 'file',
    } as const;

    const withEmpty = await generateFilesOnly({ ...options, imports: [] });
    const without = await generateFilesOnly(options);

    expect(withEmpty).toEqual(without);
  });

  test('Generate Files - JSX attributes keep quotes and backslashes', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: {
          'C:\\docs\\api.yaml': {
            openapi: '3.2.0',
            info: { title: 'API', version: '1.0.0' },
            paths: {
              '/light': {
                get: {
                  operationId: 'light',
                  summary: 'The "Light" route',
                  description: 'Say "hi"',
                },
              },
            },
          },
        },
      }),
      index: {
        url: { baseUrl: '/docs', contentDir: '' },
        items: [{ path: 'index' }],
      },
    });

    expect(out.find((file) => file.path === 'light.mdx')?.content).toContain(
      '<OpenAPIPage document="C:\\docs\\api.yaml" ',
    );
    expect(out.find((file) => file.path === 'index.mdx')?.content).toContain(
      '<Card href="/docs/light" title={"The \\"Light\\" route"} description={"Say \\"hi\\""} />',
    );
  });

  test('Generate Files - watch the input files', async () => {
    const file = path.join(cwd, './fixtures/petstore.yaml');
    const watch = vi.fn(() => ({ on() {} }));
    vi.doMock('chokidar', () => ({ watch }));
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await generateFiles({
      input: createOpenAPI({
        input: {
          petstore: file,
          inline: { openapi: '3.2.0', info: { title: 'Inline', version: '1.0.0' } },
        },
      }),
      output: '',
      watch: true,
      // nothing to write
      beforeWrite(files) {
        files.length = 0;
      },
    });

    expect(watch).toHaveBeenCalledWith([file], { ignoreInitial: true });
  });
});

function stringifyOutput(output: OutputFile[]) {
  output.sort((a, b) => a.path.localeCompare(b.path));

  const lines: string[] = [];
  for (const file of output) {
    const lang = path.extname(file.path).slice(1);
    lines.push(`\`\`\`${lang} title="${file.path}"\n${file.content}\n\`\`\``);
  }
  return lines.join('\n\n');
}

test.each(['dot', 'dir'] as const)('static source in every language, %s parser', async (parser) => {
  const source = await createOpenAPI({
    input: { museum: path.join(cwd, './fixtures/museum.yaml') },
  }).staticSource({ per: 'tag', meta: true, baseDir: 'api' });

  const { pageTree } = loader(source, {
    baseUrl: '/docs',
    i18n: { languages: ['en', 'de'], defaultLanguage: 'en', fallbackLanguage: null, parser },
  });
  // pages and `meta.json` are shared without fallback
  expect(pageTree.de.children[0]).toMatchObject({
    children: [{ name: 'Operations' }, { name: 'Events' }, { name: 'Tickets' }],
  });
});

test('refuses documents not listed in input', async () => {
  const server = createOpenAPI({ input: [path.join(cwd, './fixtures/petstore.yaml')] });

  await expect(server.getSchema(path.join(cwd, './fixtures/museum.yaml'))).rejects.toThrow(
    'is not listed in "input"',
  );
  await expect(server.getSchema('constructor')).rejects.toThrow('is not listed in "input"');
});

test('leaves documents out of page props with `includeDocument: false`', async () => {
  const input = { museum: path.join(cwd, './fixtures/museum.yaml') };
  const server = createOpenAPI({ input, proxyUrl: '/api/proxy', includeDocument: false });
  const { files } = await server.staticSource();
  const file = files.find((item) => item.type === 'page')!;
  const { document, payload } = file.data.getOpenAPIPageProps();

  expect(document).toBe('museum');
  expect(payload).toStrictEqual({ proxyUrl: '/api/proxy' });

  // a page of `generateFiles()`
  const page = { data: { _openapi: { preload: ['museum'] } } } as never;
  expect(await server.preloadOpenAPIPage(page)).toEqual({
    preloaded: { docs: {}, proxyUrl: '/api/proxy' },
  });
  const { preloaded } = await createOpenAPI({ input }).preloadOpenAPIPage(page);
  expect(Object.keys(preloaded.docs)).toEqual(['museum']);
});

test('OAuth handler sends users back to the page that started the flow', () => {
  const handler = createOpenAPI().createOAuthHandler();
  const request = (page?: string) =>
    handler(
      new Request('https://docs.example.com/api/oauth?code=abc&state=xyz', {
        headers: page ? { cookie: `fumadocs-openapi-oauth=${encodeURIComponent(page)}` } : {},
      }),
    );

  const res = request('/docs/Get%20A%20Thing');
  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toBe('/docs/Get%20A%20Thing?code=abc&state=xyz');
  expect(request().status).toBe(400);
  expect(request('//evil.example').status).toBe(400);
  expect(request('https://evil.example/docs').status).toBe(400);
});
