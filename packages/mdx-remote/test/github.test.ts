import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { generatePageTree } from '@/github';

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
