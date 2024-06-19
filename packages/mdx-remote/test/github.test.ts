import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { createCache, type CreateCacheOptions } from '@/github';
import fs from 'node:fs';
import type { CompareTreeDiff } from '@/github/diff';
import { fnv1a, type GitTreeItem } from '@/github/utils';

const cwd = path.dirname(fileURLToPath(import.meta.url));

const mockCache = vi.fn(
  async ({
    directory,
    cacheOptions,
    load = true,
    lazy = false,
  }: {
    directory: string;
    cacheOptions?: Omit<CreateCacheOptions<'local'>, 'directory'>;
    load?: boolean;
    lazy?: boolean;
  }) => {
    const cache = createCache({
      directory,
      saveFile: false,
      ...cacheOptions,
    });

    if (load)
      await cache.load({
        lazy,
      });

    return cache;
  },
);

describe('Without Saved Cache', () => {
  const directory = path.resolve(cwd, './fixtures');
  const fakeTree = [
    {
      // make sure sha property is an action (add, remove, modify)
      sha: 'add',
      type: 'blob',
      path: 'new-file.mdx',
      url: 'fixtures/new-file.mdx',
    },
    {
      type: 'blob',
      sha: 'modify',
      path: 'index.mdx',
      url: 'fixtures/index.mdx',
    },
    {
      type: 'blob',
      sha: 'remove',
      path: 'meta.json',
      url: 'fixtures/meta.json',
    },
  ] satisfies (GitTreeItem & {
    sha: CompareTreeDiff['action'];
  })[];

  const sort = <
    T extends {
      path: string;
    },
  >(
    diff: T[],
  ) => diff.sort((a, b) => a.path.localeCompare(b.path));

  test('cache.data/tree before cache.load()', async () => {
    const cache = await mockCache({
      directory,
      load: false,
    });

    expect(() => cache.data).toThrowError();
    expect(() => cache.tree).toThrowError();
  });

  test('cache.tree', async () => {
    const cache = await mockCache({ directory });

    const { sha, ...tree } = cache.tree;

    expect(tree).toMatchFileSnapshot(
      path.resolve(cwd, './out/git-tree.output.json5'),
    );
  });

  test('cache.data', async () => {
    const cache = await mockCache({ directory });

    // lastUpdated and sha are dynamic, so we need to remove them
    const {
      lastUpdated: _lastUpdated,
      sha,
      ...rendered
    } = await cache.resolveAllContent();

    await expect(rendered).toMatchFileSnapshot(
      path.resolve(cwd, './out/cache.output.json5'),
    );
  });

  test('cache.generatePageTree', async () => {
    const cache = await mockCache({ directory });

    const { getPageTree } = await cache.generatePageTree();

    await expect(await getPageTree()).toMatchFileSnapshot(
      path.resolve(cwd, './out/page-tree.output.json5'),
    );
  });

  test('cache.diff.compareToGitTree', async () => {
    const cache = await mockCache({ directory });

    const diff = cache.diff.compareToGitTree({
      sha: `${cache.tree.sha}-fake`,
      truncated: false,
      url: cache.tree.url,
      tree: cache.tree.tree
        // Remove the files that are being overwritten
        .filter((item) => !fakeTree.some((f) => f.path === item.path))
        .concat(fakeTree)
        .filter((item) => item.sha !== 'remove'),
    });
    const fakeDiff = fakeTree.map((item) => ({
      type: item.type,
      action: item.sha as CompareTreeDiff['action'],
      path: item.path,
      // if it's a remove action, the sha isn't updated internally, there fore we need to find the sha
      sha:
        item.sha === 'remove'
          ? cache.tree.tree.find((f) => f.path === item.path)?.sha ?? item.sha
          : item.sha,
    }));

    expect(sort(diff)).toEqual(sort(fakeDiff));
  });

  test('cache.diff.applyToCache', async () => {
    const cache = await mockCache({ directory });

    const diff = cache.diff.compareToGitTree({
      sha: `${cache.tree.sha}-fake`,
      truncated: false,
      url: cache.tree.url,
      tree: cache.tree.tree
        // Remove the files that are being overwritten
        .filter((item) => !fakeTree.some((f) => f.path === item.path))
        .concat(fakeTree)
        // Act as if the file was removed
        .filter((item) => item.sha !== 'remove'),
    });
    const fakeDiff = fakeTree.map((item) => ({
      type: item.type,
      action: item.sha as CompareTreeDiff['action'],
      path: item.path,
      // if it's a remove action, the sha isn't updated internally, there fore we need to find the sha
      sha:
        item.sha === 'remove'
          ? cache.tree.tree.find((f) => f.path === item.path)?.sha ?? item.sha
          : item.sha,
    }));

    cache.diff.applyToCache(diff, async (diff) =>
      // in real cases, these new files will exist, but for testing purposes, the file doesn't really exist
      // so we need to check if the file is new, if it is, return some dummy content
      fakeDiff
        .filter((item) => item.action === 'add')
        .some((f) => f.path === diff.path)
        ? 'new content'
        : fs.promises.readFile(path.resolve(directory, diff.path), 'utf8'),
    );

    for (const fakeFile of sort(
      fakeTree
        .filter((item) => item.sha !== 'remove')
        .map((item) => ({
          sha: item.sha,
          path: item.path,
        })),
    )) {
      const file = cache.data.files
        .map((file) => ({
          sha: file.sha,
          path: file.path,
        }))
        .find((f) => f.path === fakeFile.path);
      expect(file).toBeDefined();
      expect(file).toMatchObject(fakeFile);
    }
  });

  test('cache.load (lazy)', async () => {
    const cache = await mockCache({
      directory,
      lazy: true,
      cacheOptions: {
        saveFile: false,
      },
    });

    expect(cache.data.files).toHaveLength(0);
    expect(cache.data.subDirectories).toHaveLength(0);
    expect(cache.tree.tree).toHaveLength(0);

    cache.fs().loadFile(
      {
        path: 'index.mdx',
        sha: 'add',
      },
      fs.promises.readFile(path.resolve(directory, 'index.mdx'), 'utf8'),
    );

    expect(cache.data.files).toHaveLength(1);
    expect(cache.tree.tree).toHaveLength(1);
  });

  test('cache.revalidationTag', async () => {
    const opts = { directory };
    const cache = await mockCache(opts);

    expect(cache.revalidationTag).toBe(
      `@fumadocs/mdx-remote/github/cache@${fnv1a(JSON.stringify(opts))}`,
    );
  });
});

describe('With Saved Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const cachePath = path.resolve(directory, '.fumadocs', 'cache.json');
  const cache = await mockCache({ directory });

  beforeAll(async () => {
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.promises.writeFile(
      cachePath,
      JSON.stringify(await cache.resolveAllContent()),
      'utf8',
    );
  });

  // cache.fs.readFile
  test('cache.fs().readFile', async () => {
    const newCache = await mockCache({
      directory,
      cacheOptions: {
        saveFile: cachePath,
      },
      load: false,
    });
    await newCache.load();

    const files = await Promise.all(cache.fs().getFiles());

    for (const file of files) {
      const vfile = await newCache.fs().readFile(file);
      expect(vfile).toEqual(
        await fs.promises.readFile(path.resolve(directory, file), 'utf8'),
      );
    }
  });

  afterAll(async () => {
    await fs.promises.rm(path.dirname(cachePath), {
      recursive: true,
    });
  });
});
