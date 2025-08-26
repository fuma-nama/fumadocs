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

  test('Generate Files - with index option (string format)', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'operation',
      index: {
        name: 'api-overview',
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate individual operation files + index file
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/api-overview.mdx'),
      expect.anything(),
    );

    // Verify index.mdx is generated in addition to operation files
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const indexCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('api-overview.mdx'),
    );
    expect(indexCall).toBeDefined();
  });

  test('Generate Files - index with per tag', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'tag',
      index: {
        name: 'index',
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate tag files + index file
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/index.mdx'),
      expect.anything(),
    );
  });

  test('Generate Files - index with per file', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: 'index',
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate the main file + index file
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/index.mdx'),
      expect.anything(),
    );
  });

  test('Generate Files - index with Record format (individual indexes)', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: {
          './fixtures/museum.yaml': 'museum-api',
          './fixtures/petstore.yaml': 'petstore-api',
        },
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate separate index files for each input
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/museum-api.mdx'),
      expect.anything(),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/petstore-api.mdx'),
      expect.anything(),
    );
  });

  test('Generate Files - index with Record format (shared index)', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: {
          './fixtures/museum.yaml': 'shared-api',
          './fixtures/petstore.yaml': 'shared-api',
        },
        url: '/docs/api',
      },
      imports: [
        {
          names: ['source'],
          from: '@/lib/source',
        },
        {
          names: ['getPageTreePeers'],
          from: 'fumadocs-core/server',
        },
      ],
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate only one shared index file (deduplication)
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const sharedIndexCalls = writeFileCalls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('shared-api.mdx'),
    );
    expect(sharedIndexCalls).toHaveLength(1);

    // Verify the content includes Cards format
    const [, content] = sharedIndexCalls[0] as [string, string];
    expect(content).toContain('<Cards>');
    expect(content).toContain('getPageTreePeers');
    expect(content).toContain('import { source } from "@/lib/source";');
  });

  test('Generate Files - index with partial mapping', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: {
          './fixtures/museum.yaml': 'museum-only',
          // petstore.yaml intentionally omitted
        },
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Should generate index only for museum
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(cwd, './out/museum-only.mdx'),
      expect.anything(),
    );

    // Should not generate index for petstore
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const petstoreIndexCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('petstore') &&
        call[0].endsWith('.mdx'),
    );
    // Only the main petstore.mdx file should exist, not an index
    expect(petstoreIndexCall?.[0]).toMatch(/petstore\.mdx$/);
  });

  test('Generate Files - with imports configuration', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'file',
      imports: [
        {
          names: ['CustomComponent', 'AnotherComponent'],
          from: '@/components/custom',
        },
        {
          names: ['utils'],
          from: '@/lib/utils',
        },
      ],
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Verify imports are included in generated content
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const museumCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('museum.mdx'),
    );
    expect(museumCall).toBeDefined();

    const [, content] = museumCall as [string, string];
    expect(content).toContain(
      'import { CustomComponent, AnotherComponent } from "@/components/custom";',
    );
    expect(content).toContain('import { utils } from "@/lib/utils";');
  });

  test('Generate Files - index with title and description (multi-schema)', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: {
          './fixtures/museum.yaml': 'comprehensive-api',
          './fixtures/petstore.yaml': 'comprehensive-api',
        },
        title: 'Comprehensive API Documentation',
        description: 'Complete API reference for all endpoints',
      },
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Verify index file is generated with title and description
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const indexCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].endsWith('comprehensive-api.mdx'),
    );
    expect(indexCall).toBeDefined();

    const [, content] = indexCall as [string, string];
    expect(content).toContain('title: "Comprehensive API Documentation"');
    expect(content).toContain(
      'description: "Complete API reference for all endpoints"',
    );
  });

  test('Generate Files - Cards format with missing imports (empty content)', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: {
          './fixtures/museum.yaml': 'empty-api',
          './fixtures/petstore.yaml': 'empty-api',
        },
        url: '/docs/api',
        title: 'API Overview',
        description: 'All available APIs',
      },
      // No imports provided - should generate empty content
      cwd,
    });

    const fs = await import('node:fs/promises');

    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const emptyIndexCalls = writeFileCalls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('empty-api.mdx'),
    );
    expect(emptyIndexCalls).toHaveLength(1);

    // Verify empty content (only frontmatter and comment)
    const [, content] = emptyIndexCalls[0] as [string, string];
    expect(content).not.toContain('<Cards>');
    expect(content).not.toContain('<Card title=');
    expect(content).toContain('title: "API Overview"');
    expect(content).toContain('description: "All available APIs"');
    // Should not contain getPageTreePeers since imports are missing
    expect(content).not.toContain('getPageTreePeers');
  });

  test('Generate Files - multiple imports with different sources', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'operation',
      imports: [
        {
          names: ['Button', 'Card'],
          from: '@/components/ui',
        },
        {
          names: ['formatDate'],
          from: '@/lib/date-utils',
        },
        {
          names: ['API_BASE_URL'],
          from: '@/constants',
        },
      ],
      cwd,
    });

    const fs = await import('node:fs/promises');

    // Check that all imports are included in generated files
    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;

    // Find any generated operation file to verify imports
    const operationCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('/out/') &&
        call[0].endsWith('.mdx'),
    );
    expect(operationCall).toBeDefined();

    const [, content] = operationCall as [string, string];
    expect(content).toContain(
      'import { Button, Card } from "@/components/ui";',
    );
    expect(content).toContain('import { formatDate } from "@/lib/date-utils";');
    expect(content).toContain('import { API_BASE_URL } from "@/constants";');
  });

  test('Generate Files - index with url but partial imports (empty content)', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml', './fixtures/petstore.yaml'],
      output: './out',
      per: 'file',
      index: {
        name: {
          './fixtures/museum.yaml': 'partial-imports-api',
          './fixtures/petstore.yaml': 'partial-imports-api',
        },
        url: '/docs/api',
      },
      imports: [
        {
          names: ['source'],
          from: '@/lib/source',
        },
        // Missing getPageTreePeers import - should generate empty content
      ],
      cwd,
    });

    const fs = await import('node:fs/promises');

    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const partialImportsCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].endsWith('partial-imports-api.mdx'),
    );
    expect(partialImportsCall).toBeDefined();

    const [, content] = partialImportsCall as [string, string];
    expect(content).not.toContain('<Cards>');
    expect(content).toContain('import { source } from "@/lib/source";');
    // Should not contain getPageTreePeers since it's missing
    expect(content).not.toContain('getPageTreePeers');
    expect(content).not.toContain('<Card title=');
  });

  test('Generate Files - empty imports array', async () => {
    await generateFiles({
      input: ['./fixtures/museum.yaml'],
      output: './out',
      per: 'file',
      imports: [], // Empty imports array
      cwd,
    });

    const fs = await import('node:fs/promises');

    const writeFileCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls;
    const museumCall = writeFileCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].endsWith('museum.mdx'),
    );
    expect(museumCall).toBeDefined();

    const [, content] = museumCall as [string, string];
    // Should not contain any import statements
    expect(content).not.toMatch(/^import .* from .*/m);
  });
});
