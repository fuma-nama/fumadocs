import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';
import { createCache } from '@/github';
import fs from 'node:fs';
import type { CompareTreeDiff } from '@/github/diff';

const cwd = path.dirname(fileURLToPath(import.meta.url));

const mockCache = vi.fn(async (directory: string) => {
  const cache = createCache({
    directory,
  });

  await cache.init();

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
});

// DO NOT REMOVE THIS, WILL BREAK SOME CACHE TESTS
const sort = <
  T extends {
    path: string;
  },
>(
  diff: T[],
) => diff.sort((a, b) => a.path.localeCompare(b.path));

test('Generate Page Tree From Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache } = await mockCache(directory);

  const pageTree = await cache.generatePageTree();

  await expect(pageTree).toMatchFileSnapshot(
    path.resolve(cwd, './out/page-tree.output.json5'),
  );
});

test('Transform Git Tree to GitHub Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache } = await mockCache(directory);

  const { lastUpdated: _lastUpdated, ...rendered } = await cache.render();

  await expect(rendered).toMatchFileSnapshot(
    path.resolve(cwd, './out/cache.output.json5'),
  );
});

test('Differientate Between Two Git Trees', async () => {
  vi.restoreAllMocks();
  const directory = path.resolve(cwd, './fixtures');
  const { cache, fakeTree } = await mockCache(directory);

  const diff = cache.compareToTree({
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

test('Apply Differences To Current Cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache, fakeTree } = await mockCache(directory);

  const diff = cache.compareToTree({
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

  cache.applyDiff(diff, async (diff) =>
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
