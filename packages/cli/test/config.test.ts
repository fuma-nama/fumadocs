import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getDefaultConfig } from '@/config';
import { rewriteLayoutImports } from '@/commands/customise';

test('config: align with shadcn aliases', async () => {
  const config = await getDefaultConfig(path.join(__dirname, 'fixtures/shadcn'));
  expect(config.aliases).toMatchInlineSnapshot(`
    {
      "componentsDir": "./components",
      "cssDir": "./styles",
      "layoutDir": "./layouts",
      "libDir": "./lib",
      "uiDir": "./ui",
      "utils": "./lib/utils",
    }
  `);
});

test('customise: rewrite layout imports of route files', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'fumadocs-cli-'));
  const file = path.join(cwd, 'app/(docs)/layout.tsx');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    "import { DocsLayout } from 'fumadocs-ui/layouts/docs';\nimport { baseOptions } from '@/lib/layout.shared';\n",
  );
  const config = await getDefaultConfig(cwd);
  const prev = process.cwd();
  process.chdir(cwd);
  const updated = await rewriteLayoutImports(
    config,
    new Map([['fumadocs-ui/layouts/docs', '@/layouts/docs']]),
  ).finally(() => process.chdir(prev));
  expect(updated).toEqual(['app/(docs)/layout.tsx']);
  expect(await fs.readFile(file, 'utf-8')).toBe(
    "import { DocsLayout } from '@/layouts/docs';\nimport { baseOptions } from '@/lib/layout.shared';\n",
  );
});
