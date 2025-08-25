import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { idToTitle } from '@/utils/id-to-title';
import { resolveRequestData } from '@/utils/url';
import { generateFiles } from '../src';
import { processDocument } from '@/utils/process-document';
import { generateAll, generateTags } from '@/generate';

describe('Utilities', () => {
  test('Operation ID to Title', () => {
    expect(idToTitle('getKey')).toBe('Get Key');
    expect(idToTitle('requestId30')).toBe('Request Id30');
    expect(idToTitle('requestId-30')).toBe('Request Id 30');
  });

  describe('resolveRequestData', () => {
    test('Standard OpenAPI path with path parameters', () => {
      const result = resolveRequestData('/api/users/{id}/posts/{postId}', {
        method: 'GET',
        path: {
          id: { value: '123' },
          postId: { value: '456' },
        },
        query: {
          limit: { value: '10' },
          offset: { value: '0' },
        },
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/users/123/posts/456?limit=10&offset=0');
    });

    test('Standard OpenAPI path without query parameters', () => {
      const result = resolveRequestData('/api/users/{id}', {
        method: 'GET',
        path: {
          id: { value: '123' },
        },
        query: {},
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/users/123');
    });

    test('Legacy API path with embedded query parameters', () => {
      const result = resolveRequestData('/api/legacy?fixed=param&userId={id}', {
        method: 'GET',
        path: {
          id: { value: '123' },
        },
        query: {
          limit: { value: '10' },
        },
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/legacy?fixed=param&userId=123&limit=10');
    });

    test('Legacy API path with embedded query parameters and parameter replacement', () => {
      const result = resolveRequestData(
        '/api/legacy?version={version}&type=user&id={userId}',
        {
          method: 'GET',
          path: {
            version: { value: 'v2' },
            userId: { value: '456' },
          },
          query: {
            format: { value: 'json' },
            include: { value: 'profile' },
          },
          header: {},
          cookie: {},
        },
      );
      expect(result).toBe(
        '/api/legacy?version=v2&type=user&id=456&format=json&include=profile',
      );
    });

    test('Legacy API path with query parameter override', () => {
      const result = resolveRequestData('/api/legacy?limit=5&userId={id}', {
        method: 'GET',
        path: {
          id: { value: '123' },
        },
        query: {
          limit: { value: '20' }, // Should override the existing limit=5
        },
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/legacy?limit=20&userId=123');
    });

    test('Array path parameters', () => {
      const result = resolveRequestData('/api/files/{path}', {
        method: 'GET',
        path: {
          path: { value: ['folder1', 'folder2', 'file.txt'] },
        },
        query: {},
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/files/folder1/folder2/file.txt');
    });

    test('Array query parameters', () => {
      const result = resolveRequestData('/api/search', {
        method: 'GET',
        path: {},
        query: {
          tags: { value: ['javascript', 'typescript', 'react'] },
          single: { value: 'value' },
        },
        header: {},
        cookie: {},
      });
      expect(result).toBe(
        '/api/search?tags=javascript&tags=typescript&tags=react&single=value',
      );
    });

    test('Legacy API with array query parameters', () => {
      const result = resolveRequestData('/api/legacy?base=true&userId={id}', {
        method: 'GET',
        path: {
          id: { value: '123' },
        },
        query: {
          categories: { value: ['tech', 'news'] },
        },
        header: {},
        cookie: {},
      });
      expect(result).toBe(
        '/api/legacy?base=true&userId=123&categories=tech&categories=news',
      );
    });

    test('Empty path and query parameters', () => {
      const result = resolveRequestData('/api/simple', {
        method: 'GET',
        path: {},
        query: {},
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/simple');
    });

    test('Legacy API path with only embedded query parameters', () => {
      const result = resolveRequestData('/api/legacy?version=v1&type=user', {
        method: 'GET',
        path: {},
        query: {},
        header: {},
        cookie: {},
      });
      expect(result).toBe('/api/legacy?version=v1&type=user');
    });
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
