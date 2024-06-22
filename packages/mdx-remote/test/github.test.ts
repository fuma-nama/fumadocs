import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { type CreateCacheLocalOptions, createLocalCache } from '@/github';
import fs from 'node:fs';
import { CompareTreeDiff, createDiff } from '@/github/create/diff';
import { type GitTreeItem } from '@/github/utils';
import { loader } from '@/github/source';

const cwd = path.dirname(fileURLToPath(import.meta.url));

const mockCache = vi.fn(
  async ({
    directory,
    cacheOptions,
    load = true,
  }: {
    directory: string;
    cacheOptions?: Omit<CreateCacheLocalOptions, 'directory'>;
    load?: boolean;
  }) => {
    const cache = createLocalCache({
      directory,
      saveFile: false,
      ...cacheOptions,
    });

    if (load) await cache.load();

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

  test('cache.tree', async () => {
    const cache = await mockCache({ directory });

    const { sha, ...tree } = await cache.getTree();

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

  test('Generate Page Tree from cache', async () => {
    const cache = await mockCache({ directory });
    const { getPageTree } = await loader(cache, {
      baseUrl: '/docs',
    });

    await expect(await getPageTree()).toMatchFileSnapshot(
      path.resolve(cwd, './out/page-tree.output.json5'),
    );
  });

  test('cache.diff.compareToGitTree', async () => {
    const cache = await mockCache({ directory });
    const tree = await cache.getTree();

    const diff = cache.diff.compareToGitTree(await cache.getData(), {
      sha: `${tree.sha}-fake`,
      truncated: false,
      url: tree.url,
      tree: tree.tree
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
          ? tree.tree.find((f) => f.path === item.path)?.sha ?? item.sha
          : item.sha,
    }));

    expect(sort(diff)).toEqual(sort(fakeDiff));
  });

  test('cache.diff.applyToCache', async () => {
    const cache = await mockCache({ directory });
    const tree = await cache.getTree();
    const cacheFile = await cache.getData();

    const diff = cache.diff.compareToGitTree(cacheFile, {
      sha: `${tree.sha}-fake`,
      truncated: false,
      url: tree.url,
      tree: tree.tree
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
          ? tree.tree.find((f) => f.path === item.path)?.sha ?? item.sha
          : item.sha,
    }));

    // in real cases, these new files will exist, but for testing purposes, the file doesn't really exist
    // so we need to check if the file is new, if it is, return some dummy content
    const newDiff = createDiff(cache.getFileSystem(), (diff) =>
      fakeDiff
        .filter((item) => item.action === 'add')
        .some((f) => f.path === diff.path)
        ? 'new content'
        : fs.promises.readFile(path.resolve(directory, diff.path), 'utf8'),
    );

    newDiff.applyToCache(cacheFile, diff);

    for (const fakeFile of sort(
      fakeTree
        .filter((item) => item.sha !== 'remove')
        .map((item) => ({
          sha: item.sha,
          path: item.path,
        })),
    )) {
      const file = cacheFile.files
        .map((file) => ({
          sha: file.sha,
          path: file.path,
        }))
        .find((f) => f.path === fakeFile.path);
      expect(file).toBeDefined();
      expect(file).toMatchObject(fakeFile);
    }
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

    const files = await Promise.all(cache.getFileSystem().getFiles());

    for (const file of files) {
      const vfile = await newCache.getFileSystem().readFile(file);
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
