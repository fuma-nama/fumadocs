import { expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { convertVaultFiles } from '@/convert';
import { readVaultFiles } from '@/index';

const cwd = path.dirname(fileURLToPath(import.meta.url));
test('run', async () => {
  const files = await readVaultFiles({
    dir: path.join(cwd, 'fixtures'),
  });

  const output = await convertVaultFiles(files);
  expect(output.map((file) => file.path).sort()).toMatchInlineSnapshot(`
    [
      "create-a-link.mdx",
      "hello-world.mdx",
      "welcome.mdx",
      "xmas.png",
    ]
  `);
  for (const file of output) {
    if (file.type === 'asset') continue;
    await expect(file.content).toMatchFileSnapshot(path.join('out', file.path));
  }
});
