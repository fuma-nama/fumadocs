import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { generatePageTree } from '@/github';
import {
  type CompareTreeDiff,
  createCompareTree,
  filesToGitTree,
  createTransformTreeToCache,
  createApplyDiff,
  createRenderer,
} from '@/github/utils';
import fs from 'node:fs/promises';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('Generate Page Tree', async () => {
  const directory = path.resolve(cwd, './fixtures');

  const output = await generatePageTree({
    directory,
  });

  await expect(output).toMatchFileSnapshot(
    path.resolve(cwd, './out/page-tree.output.json5'),
  );
});

const mockCacheInstace = async (directory: string) => {
  const tree = await filesToGitTree({
    directory,
  });

  const cache = await createTransformTreeToCache(async (file: string) =>
    fs.readFile(path.resolve(directory, file), 'utf-8'),
  )(tree);

  return {
    cache,
    tree: {
      real: tree,
      fake: [
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
      ] as ((typeof tree)['tree'][number] & {
        sha: CompareTreeDiff['action'];
      })[],
    },
  };
};

test('Transform Git tree to cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const {
    cache: { lastUpdated, ...cache },
  } = await mockCacheInstace(directory);
  const render = createRenderer({
    lastUpdated,
    ...cache,
  });
  const { lastUpdated: _lastUpdated, ...rendered } = await render();

  await expect(rendered).toMatchFileSnapshot(
    path.resolve(cwd, './out/cache.output.json5'),
  );
});

test('Differientate between two trees', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache, tree } = await mockCacheInstace(directory);
  const compareTree = createCompareTree(cache);

  const diff = compareTree({
    sha: `${tree.real.sha}-fake`,
    truncated: false,
    url: tree.real.url,
    tree: tree.real.tree
      // Remove the files that are being overwritten
      .filter((item) => !tree.fake.some((f) => f.url === item.url))
      .concat(tree.fake)
      // Act as if the file was removed
      .filter((item) => item.sha !== 'remove'),
  });
  const fakeDiff = tree.fake.map((item) => ({
    type: item.type,
    action: item.sha as CompareTreeDiff['action'],
    path: item.path,
    // if it's a remove action, the sha isn't updated internally, there fore we need to find the sha
    sha:
      item.sha === 'remove'
        ? tree.real.tree.find((f) => f.url === item.url)?.sha ?? item.sha
        : item.sha,
  }));

  // DO NOT REMOVE THIS, WILL BREAK TEST (toStrictEqual)
  const sort = <T extends CompareTreeDiff>(diff: T[]) =>
    diff.sort((a, b) => a.path.localeCompare(b.path));

  expect(sort(diff)).toStrictEqual(sort(fakeDiff));
});

test('Apply differences to cache', async () => {
  const directory = path.resolve(cwd, './fixtures');
  const { cache, tree } = await mockCacheInstace(directory);
  const compareTree = createCompareTree(cache);

  const diff = compareTree({
    sha: `${tree.real.sha}-fake`,
    truncated: false,
    url: tree.real.url,
    tree: tree.real.tree
      // Remove the files that are being overwritten
      .filter((item) => !tree.fake.some((f) => f.url === item.url))
      .concat(tree.fake)
      // Act as if the file was removed
      .filter((item) => item.sha !== 'remove'),
  });

  const applyDiff = createApplyDiff(cache);
  applyDiff(diff);

  console.log(cache);
});
