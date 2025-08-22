import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { idToTitle } from '@/utils/id-to-title';
import { generateFiles } from '../src';
import { processDocument } from '@/utils/process-document';
import { generateAll, generateTags } from '@/generate';

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
    const result = await generateAll(
      './fixtures/petstore.yaml',
      await processDocument(join(cwd, './fixtures/petstore.yaml')),
      {
        cwd,
      },
    );

    await expect(result).toMatchFileSnapshot('./out/petstore.mdx');
  });

  test('Museum', async () => {
    const tags = await generateTags(
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
    const tags = await generateTags(
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
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: No input files found.]`,
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
        name: {
          algorithm: 'v1',
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: No input files found.]`,
    );
  });

  test('Generate Files - groupBy tag per operation', async () => {
    await generateFiles({
      input: ['./fixtures/products.yaml'],
      output: './out',
      per: 'operation',
      groupBy: 'tag',
      name: {
        algorithm: 'v1',
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    expect(fs.writeFile).toBeCalledTimes(3);

    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/products/products/productid.mdx'),
      expect.anything(),
    );

    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/inventory/inventory/productid.mdx'),
      expect.anything(),
    );

    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/products/inventory/productid.mdx'),
      expect.anything(),
    );
  });

  test('Generate Files - with generateIndex option', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'operation',
      generateIndex: true,
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate individual operation files + index file
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/index.mdx'),
      expect.anything(),
    );

    // Verify index.mdx is generated in addition to operation files
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const indexCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('index.mdx'),
    );
    expect(indexCall).toBeDefined();
  });

  test('Generate Files - generateIndex with per tag', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'tag',
      generateIndex: true,
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate tag files + index file
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/index.mdx'),
      expect.anything(),
    );
  });

  test('Generate Files - generateIndex with per file', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'file',
      generateIndex: true,
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate the main file + index file
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/index.mdx'),
      expect.anything(),
    );
  });

  test('Generate Files - custom index naming function', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'operation',
      generateIndex: true,
      name: (output, document, isIndex) => {
        if (isIndex) {
          return 'api-overview';
        }
        return 'default-name';
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should use custom index name
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/api-overview.mdx'),
      expect.anything(),
    );

    // Verify the custom naming function was called for index
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const indexCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('api-overview.mdx'),
    );
    expect(indexCall).toBeDefined();
  });

  test('Generate Files - index naming respects per mode', async () => {
    // Test that index naming works across different per modes
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'tag',
      generateIndex: true,
      name: (output, document, isIndex) => {
        if (isIndex) {
          return 'tag-index';
        }
        return 'tag-default';
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/tag-index.mdx'),
      expect.anything(),
    );
  });
});
