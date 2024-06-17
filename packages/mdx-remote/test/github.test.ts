import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { generatePageTree } from '@/github';
import {
  type CompareTreeDiff,
  createCompareTree,
  filesToGitTree,
  createTransformTreeToCache,
} from '@/github/utils';

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

test('Transform Git tree to cache', async () => {
  const directory = path.resolve(cwd, './fixtures');

  const tree = await filesToGitTree({
    directory,
  });
  const { lastUpdated, ...cache } = await createTransformTreeToCache()(tree);

  await expect(cache).toMatchFileSnapshot(
    path.resolve(cwd, './out/cache.output.json5'),
  );
});

test('Differientate between two trees', async () => {
  const directory = path.resolve(cwd, './fixtures');

  const tree = await filesToGitTree({
    directory,
  });

  const cache = await createTransformTreeToCache()(tree);
  const compareTree = createCompareTree(cache);

  const fakeTree: ((typeof tree)['tree'][number] & {
    sha: CompareTreeDiff['action'];
  })[] = [
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
  ];

  const diff = compareTree({
    sha: `${tree.sha}-fake`,
    truncated: false,
    url: tree.url,
    tree: tree.tree
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
  }));

  // DO NOT REMOVE THIS, WILL BREAK TEST (toStrictEqual)
  const sort = (diff: CompareTreeDiff[]) =>
    diff.sort((a, b) => a.path.localeCompare(b.path));

  expect(sort(diff)).toStrictEqual(sort(fakeDiff));
});
