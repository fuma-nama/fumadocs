import path from 'node:path';
import fs from 'node:fs/promises';
import { expect, test } from 'vitest';
import { runTransform } from '@/utils/i18n/transform-root-layout';
import { createEmptyProject } from '@/utils/typescript';

const project = createEmptyProject();

test('transform layout: i18n', async () => {
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
