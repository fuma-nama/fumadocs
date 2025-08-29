import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { idToTitle } from '@/utils/id-to-title';
import { generateFilesOnly, type OutputFile } from '@/generate-file';
import { processDocument } from '@/utils/process-document';
import { generateAll, generateTags } from '@/generate';

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

  test('Pet Store', async () => {
    const result = generateAll(
      './fixtures/petstore.yaml',
      await processDocument(join(cwd, './fixtures/petstore.yaml')),
      {
        cwd,
      },
    );

    await expect(result).toMatchFileSnapshot('./out/petstore.mdx');
  });

  test('Museum', async () => {
    const tags = generateTags(
      './fixtures/museum.yaml',
      await processDocument(join(cwd, './fixtures/museum.yaml')),
      {
        cwd,
      },
    );

    for (const tag of tags) {
      await expect(tag.content).toMatchFileSnapshot(
        `./out/museum/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });

  test('Unkey', async () => {
    const tags = generateTags(
      './fixtures/unkey.json',
      await processDocument(join(cwd, './fixtures/unkey.json')),
      { cwd },
    );

    for (const tag of tags) {
      await expect(tag.content).toMatchFileSnapshot(
        `./out/unkey/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });

  test('Generate Files', async () => {
    const out = await generateFilesOnly({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      cwd,
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/petstore.json',
    );
  });

  test('Generate Files - throws error when no input files found', async () => {
    await expect(
      generateFilesOnly({
        input: ['./fixtures/non-existent-*.yaml'],
        output: './out',
        per: 'file',
        cwd,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: input not found: ./fixtures/non-existent-*.yaml]`,
    );

    await expect(
      generateFilesOnly({
        input: [
          './fixtures/non-existent-1.yaml',
          './fixtures/non-existent-2.yaml',
        ],
        output: './out',
        per: 'file',
        cwd,
        name: {
          algorithm: 'v1',
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: input not found: ./fixtures/non-existent-1.yaml]`,
    );
  });

  test('Generate Files - groupBy tag per operation', async () => {
    const out = await generateFilesOnly({
      input: ['./fixtures/products.yaml'],
      output: './out',
      per: 'operation',
      groupBy: 'tag',
      name: {
        algorithm: 'v1',
      },
      cwd,
    });

    await expect(stringifyOutput(out)).toMatchFileSnapshot(
      './out/products-per-tag.json',
    );
  });

  test('Generate Files - with index', async () => {
    const out = await generateFilesOnly({
      input: ['./fixtures/products.yaml'],
      output: './out',
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
            only: ['./fixtures/products.yaml'],
          },
        ],
      },
      cwd,
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
