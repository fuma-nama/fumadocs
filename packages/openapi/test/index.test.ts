import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { generateFilesOnly, type OutputFile } from '@/generate-file';
import { createOpenAPI } from '@/server';
import path from 'node:path';

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
