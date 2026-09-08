import { expect, test } from 'vitest';
import path from 'node:path';
import { getDefaultConfig } from '@/config';

test('config: align with shadcn aliases', async () => {
  const config = await getDefaultConfig(path.join(__dirname, 'fixtures/shadcn'));
  expect(config.aliases).toMatchInlineSnapshot(`
    {
      "componentsDir": "./components",
      "cssDir": "./styles",
      "layoutDir": "./layouts",
      "libDir": "./lib",
      "uiDir": "./ui",
    }
  `);
});
