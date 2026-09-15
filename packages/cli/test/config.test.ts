import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getDefaultConfig } from '@/config';
import { rewriteLayoutImports } from '@/commands/customise';
import { pluginReuseUI } from '@/registry/plugins/shadcn';
import type { DownloadedComponent } from 'fuma-cli/registry/installer';

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

test('reuse the ui components & cn of shadcn', async () => {
  const cwd = path.join(__dirname, 'fixtures/shadcn');
  const plugin = pluginReuseUI(await getDefaultConfig(cwd), cwd);
  const comp = {
    files: [
      { type: 'ui', path: 'components/ui/button.tsx' },
      { type: 'ui', path: 'components/ui/popover.tsx' },
      { type: 'lib', path: 'utils/cn.ts' },
    ],
  } as DownloadedComponent;

  const result = (await plugin.beforeInstall!(comp, {} as never)) as DownloadedComponent;
  expect(result.files).toEqual([{ type: 'ui', path: 'components/ui/popover.tsx' }]);
  expect(
    plugin.transformImport!('local:utils/cn.ts', {
      filePath: path.join(cwd, 'components/feedback/client.tsx'),
    } as never),
  ).toBe('../../lib/utils');
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
