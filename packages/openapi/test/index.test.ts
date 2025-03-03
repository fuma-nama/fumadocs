import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { idToTitle } from '@/utils/id-to-title';
import { generateAll, generateFiles, generateTags } from '../src';

describe('Utilities', () => {
  test('Operation ID to Title', () => {
    expect(idToTitle('getKey')).toBe('Get Key');
    expect(idToTitle('requestId30')).toBe('Request Id30');
    expect(idToTitle('requestId-30')).toBe('Request Id 30');
  });
});

describe('Generate documents', () => {
  const cwd = fileURLToPath(new URL('./', import.meta.url));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Pet Store', async () => {
    const result = await generateAll('./fixtures/petstore.yaml', {
      cwd,
    });

    await expect(result).toMatchFileSnapshot('./out/petstore.mdx');
  });

  test('Museum', async () => {
    const tags = await generateTags('./fixtures/museum.yaml', {
      cwd,
    });

    for (const tag of tags) {
      await expect(tag.content).toMatchFileSnapshot(
        `./out/museum/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });

  test('Unkey', async () => {
    const tags = await generateTags('./fixtures/unkey.json', { cwd });

    for (const tag of tags) {
      await expect(tag.content).toMatchFileSnapshot(
        `./out/unkey/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });

  vi.mock('node:fs/promises', async (importOriginal) => {
    return {
      ...(await importOriginal<typeof import('node:fs/promises')>()),
      mkdir: vi.fn().mockImplementation(() => {
        // do nothing
      }),
      writeFile: vi.fn().mockImplementation(() => {
        // do nothing
      }),
    };
  });

  test('Generate Files', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      cwd,
    });

    const fs = await import('node:fs/promises');

    expect(fs.writeFile).toBeCalledTimes(2);
    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/museum.mdx'),
      expect.anything(),
    );
    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/petstore.mdx'),
      expect.anything(),
    );

    expect(fs.mkdir).toBeCalledWith(join(cwd, './out'), expect.anything());
  });

  test('Generate Files - throws error when no input files found', async () => {
    await expect(
      generateFiles({
        input: ['./fixtures/non-existent-*.yaml'],
        output: './out',
        per: 'file',
        cwd,
      }),
    ).rejects.toThrow(
      'No input files found. Tried resolving: ./fixtures/non-existent-*.yaml',
    );

    await expect(
      generateFiles({
        input: [
          './fixtures/non-existent-1.yaml',
          './fixtures/non-existent-2.yaml',
        ],
        output: './out',
        per: 'file',
        cwd,
      }),
    ).rejects.toThrow(
      'No input files found. Tried resolving: ./fixtures/non-existent-1.yaml, ./fixtures/non-existent-2.yaml',
    );
  });

  test('Generate Files - groupBy tag per operation', async () => {
    await generateFiles({
      input: ['./fixtures/products.yaml'],
      output: './out',
      per: 'operation',
      groupBy: 'tag',
      cwd,
    });

    const fs = await import('node:fs/promises');

    expect(fs.writeFile).toBeCalledTimes(3);

    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/products/get-product-details.mdx'),
      expect.anything(),
    );

    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/products/get-inventory-for-product.mdx'),
      expect.anything(),
    );

    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/inventory/get-inventory-for-product.mdx'),
      expect.anything(),
    );

    expect(fs.mkdir).toBeCalledWith(
      join(cwd, './out/inventory'),
      expect.anything(),
    );
    expect(fs.mkdir).toBeCalledWith(
      join(cwd, './out/products'),
      expect.anything(),
    );
  });
});
