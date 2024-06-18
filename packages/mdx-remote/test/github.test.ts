import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { createCache, type CreateCacheOptions } from '@/github';
import fs from 'node:fs';
import type { CompareTreeDiff } from '@/github/diff';

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
      ...cacheOptions,
    });

    if (load)
      await cache.load({
        lazy,
      });

    return {
      cache,
      fakeTree: [
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
      ] as ((typeof cache.tree)['tree'][number] & {
        sha: CompareTreeDiff['action'];
      })[],
    };
  },
);

// DO NOT REMOVE THIS, WILL BREAK SOME CACHE TESTS
const sort = <
  T extends {
    path: string;
  },
>(
  diff: T[],
) => diff.sort((a, b) => a.path.localeCompare(b.path));

test('Error If Cache Has Not Been Loaded', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache } = await mockCache({
    directory,
    load: false,
  });

  expect(() => cache.data).toThrowError();
  expect(() => cache.tree).toThrowError();
});

test('Transform Git Tree to GitHub Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache } = await mockCache({ directory });

  const { lastUpdated: _lastUpdated, ...rendered } =
    await cache.resolveAllContent();

  await expect(rendered).toMatchFileSnapshot(
    path.resolve(cwd, './out/cache.output.json5'),
  );
});

test('Generate Page Tree from Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache } = await mockCache({ directory });

  const pageTree = await cache.generatePageTree();

  await expect(pageTree).toMatchFileSnapshot(
    path.resolve(cwd, './out/page-tree.output.json5'),
  );
});

test('Differientate between Two Git Trees', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache, fakeTree } = await mockCache({ directory });

  const diff = cache.diff.compareToGitTree({
    sha: `${cache.tree.sha}-fake`,
    truncated: false,
    url: cache.tree.url,
    tree: cache.tree.tree
      // Remove the files that are being overwritten
      .filter((item) => !fakeTree.some((f) => f.url === item.url))
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
        ? cache.tree.tree.find((f) => f.url === item.url)?.sha ?? item.sha
        : item.sha,
  }));

  expect(sort(diff)).toEqual(sort(fakeDiff));
});

test('Apply Differences to Current Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache, fakeTree } = await mockCache({ directory });

  const diff = cache.diff.compareToGitTree({
    sha: `${cache.tree.sha}-fake`,
    truncated: false,
    url: cache.tree.url,
    tree: cache.tree.tree
      // Remove the files that are being overwritten
      .filter((item) => !fakeTree.some((f) => f.url === item.url))
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
        ? cache.tree.tree.find((f) => f.url === item.url)?.sha ?? item.sha
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

test('Lazy Load Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache } = await mockCache({
    directory,
    lazy: true,
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

test('Read Files from Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const cachePath = path.resolve(directory, '.fumadocs', 'cache.json');
  const { cache } = await mockCache({ directory });

  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.promises.writeFile(
    cachePath,
    JSON.stringify(await cache.resolveAllContent()),
    'utf8',
  );

  const { cache: newCache } = await mockCache({
    directory,
    cacheOptions: {
      cachePath
    },
    load: false,
  });
  await newCache.load()

  const files = await Promise.all(cache.fs().getFiles())

  for (const file of files) {
    const vfile = await newCache.fs().readFile(file);
    expect(vfile).toEqual(
      await fs.promises.readFile(path.resolve(directory, file), 'utf8'),
    )
  }
});
