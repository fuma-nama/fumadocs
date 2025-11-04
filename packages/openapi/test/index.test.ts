import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { idToTitle } from '@/utils/id-to-title';
import { generateFilesOnly, type OutputFile } from '@/generate-file';
import { createOpenAPI } from '@/server';
import path from 'node:path';

describe('Utilities', () => {
  test('Operation ID to Title', () => {
    expect(idToTitle('getKey')).toBe('Get Key');
    expect(idToTitle('requestId30')).toBe('Request Id30');
    expect(idToTitle('requestId-30')).toBe('Request Id 30');
  });
});

const cwd = fileURLToPath(new URL('./', import.meta.url));

describe('Generate documents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Pet Store (Per Operation)', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: [path.join(cwd, './fixtures/petstore.yaml')],
      }),
      per: 'operation',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/petstore-per-operation.json',
    );
  });

  test('Museum (Per Tag)', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: [path.join(cwd, './fixtures/museum.yaml')],
      }),
      per: 'tag',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/museum-per-tag.json',
    );
  });

  test('Unkey (Per File)', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: [path.join(cwd, './fixtures/unkey.json')],
      }),
      per: 'file',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/unkey-per-file.json',
    );
  });

  test('Generate Files', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: [
          path.join(cwd, './fixtures/museum.yaml'),
          path.join(cwd, './fixtures/petstore.yaml'),
        ],
      }),
      per: 'file',
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/museum+petstore.json',
    );
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
        input: [path.join(cwd, './fixtures/products.yaml')],
      }),
      per: 'operation',
      groupBy: 'tag',
      name: {
        algorithm: 'v1',
      },
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/products-group-by-tag.json',
    );
  });

  test('Generate Files - with index', async () => {
    const out = await generateFilesOnly({
      input: createOpenAPI({
        input: () => ({
          products: path.join(cwd, './fixtures/products.yaml'),
        }),
      }),
      per: 'operation',
      name: {
        algorithm: 'v1',
      },
      index: {
        url: {
          baseUrl: '/docs',
          contentDir: './out',
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

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/products-with-index.json',
    );
  });
});

function stringifyOutput(output: OutputFile[]) {
  return JSON.stringify(
    output.sort((a, b) => a.path.localeCompare(b.path)),
    null,
    2,
  ).replaceAll(cwd, '~');
}
