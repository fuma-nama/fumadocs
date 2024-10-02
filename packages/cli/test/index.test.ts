import path from 'node:path';
import fs from 'node:fs/promises';
import { expect, test } from 'vitest';
import { runTransform } from '@/utils/i18n/transform-root-layout';
import { createEmptyProject } from '@/utils/typescript';
import { build, type Registry } from '@/build/build-registry';
import * as docs from '../../../apps/docs/components/registry.mjs';

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

test('build registry: docs', { timeout: 1000 * 15 }, async () => {
  const out = await build(docs.registry as Registry);

  await expect(JSON.stringify(out.index, null, 2)).toMatchFileSnapshot(
    `./fixture/out/_registry.json`,
  );

  for (const comp of out.components) {
    await expect(JSON.stringify(comp, null, 2)).toMatchFileSnapshot(
      `./fixture/out/${comp.name}.json`,
    );
  }
});
