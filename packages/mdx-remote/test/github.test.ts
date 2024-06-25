import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getGitHubFiles, getLocalFiles } from '@/github';
import * as blog from '@/github/api/fetch-blob';
import * as tree from '@/github/api/fetch-tree';

const cwd = path.dirname(fileURLToPath(import.meta.url));

describe('Get Files', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Local Files', async () => {
    const files = await getLocalFiles({
      directory: path.resolve(cwd, './fixtures'),
    });

    expect(files).toMatchFileSnapshot(
      path.resolve(cwd, './out/local-files.json5'),
    );
  });

  test('Local Files with `keepContent`', async () => {
    const files = await getLocalFiles({
      directory: path.resolve(cwd, './fixtures'),
      keepContent: true,
    });

    for (const file of files) {
      if (file.type === 'page') expect(file.data.data.content).toBeDefined();
    }
  });

  test('Remote Files', async () => {
    vi.spyOn(tree, 'fetchTree').mockImplementation(() => {
      return Promise.resolve({
        sha: 'main',
        url: '...',
        truncated: false,
        tree: [
          {
            type: 'blob',
            sha: '1',
            url: '1',
            path: 'content/index.mdx',
          },
          {
            type: 'blob',
            sha: '3',
            url: '3',
            path: 'content/test.mdx',
          },
          {
            type: 'blob',
            sha: '2',
            url: '2',
            path: 'outside.mdx',
          },
        ],
      });
    });

    vi.spyOn(blog, 'fetchBlob').mockImplementation(() => {
      return Promise.resolve({
        encoding: 'utf8',
        content: `
        ---
        title: Hello World
        ---
        
        # Hey
        `,
      });
    });

    const files = await getGitHubFiles({
      directory: './content',
      owner: 'owner',
      repo: 'repo',
      accessToken: 'token',
    });

    expect(files).toMatchFileSnapshot(
      path.resolve(cwd, './out/github-files.json5'),
    );
  });
});
