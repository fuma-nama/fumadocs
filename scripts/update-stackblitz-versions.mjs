/**
 * Update template for StackBlitz
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const packageDirs = {
  'fumadocs-core': 'packages/core',
  'fumadocs-mdx': 'packages/mdx',
  'fumadocs-ui': 'packages/radix-ui',
};

const stackblitzPath = join(root, 'examples/stackblitz/package.json');
const stackblitz = JSON.parse(readFileSync(stackblitzPath, 'utf8'));

for (const [name, dir] of Object.entries(packageDirs)) {
  if (!stackblitz.dependencies || !(name in stackblitz.dependencies)) continue;

  const { version } = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
  stackblitz.dependencies[name] = version;
}

writeFileSync(stackblitzPath, `${JSON.stringify(stackblitz, null, 2)}\n`);
