import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { loadConfig } from '@/config/load-from-file';
import { createCore } from '@/core';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(baseDir, 'fixtures/load-config');

beforeAll(async () => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'source.config.ts'),
    `const compiler: string = 'mdx';
export default { compiler };
`,
  );
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

test('load existing config file', async () => {
  const core = createCore({
    environment: 'test',
    configPath: path.join(dir, 'source.config.ts'),
    outDir: path.join(dir, '.out'),
  });

  const config = await loadConfig(core, true);
  expect(config).toBeDefined();
  expect(config?.global.compiler).toBe('mdx');
});
