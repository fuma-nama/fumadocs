import path from 'node:path';
import fs from 'node:fs/promises';
import { expect, test } from 'vitest';
import { runTransform } from '@/utils/i18n/transform-root-layout';
import { createEmptyProject } from '@/utils/typescript';
import { build } from '@/build/build-registry';
import * as repo from './repo/registry';
import * as repo2 from './repo-2/registry';

const project = createEmptyProject();

test('transform layout: i18n', { timeout: 1000 * 15 }, async () => {
  const sourceFile = project.createSourceFile(
    'layout.tsx',
    await fs
      .readFile(path.join(__dirname, './fixture/layout'))
      .then((r) => r.toString()),
  );

  runTransform(sourceFile);
  await expect(sourceFile.getFullText()).toMatchFileSnapshot(
    './fixture/layout.out',
  );
});

test('build registry', { timeout: 1000 * 15 }, async () => {
  const out = await build(repo.registry);

  await expect(JSON.stringify(out.index, null, 2)).toMatchFileSnapshot(
    `./out/repo/_registry.json`,
  );

  for (const comp of out.components) {
    await expect(JSON.stringify(comp, null, 2)).toMatchFileSnapshot(
      `./out/repo/${comp.name}.json`,
    );
  }
});

test('build registry: extended', { timeout: 1000 * 15 }, async () => {
  const out = await build(repo2.registry);

  await expect(JSON.stringify(out.index, null, 2)).toMatchFileSnapshot(
    `./out/extended/_registry.json`,
  );

  for (const comp of out.components) {
    await expect(JSON.stringify(comp, null, 2)).toMatchFileSnapshot(
      `./out/extended/${comp.name}.json`,
    );
  }
});
