import { expect, test } from 'vitest';
import { glob } from 'tinyglobby';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { convertVaultFiles, VaultFile } from '@/index';
import * as fs from 'node:fs/promises';

const cwd = path.dirname(fileURLToPath(import.meta.url));
test('run', async () => {
  const paths = await glob('fixtures/**/*', { cwd });
  const files: VaultFile[] = await Promise.all(
    paths.map(async (file) => ({
      path: path.relative('fixtures', file),
      content: await fs.readFile(path.join(cwd, file)),
    })),
  );

  const output = await convertVaultFiles(files);
  for (const file of output) {
    if (file.type === 'asset') continue;
    await expect(file.content).toMatchFileSnapshot(path.join('out', file.path));
  }
});
