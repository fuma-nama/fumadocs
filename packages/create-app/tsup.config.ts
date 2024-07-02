import { writeFileSync } from 'node:fs';
import { defineConfig } from 'tsup';
import corePkg from '../core/package.json';
import uiPkg from '../ui/package.json';
import mdxPkg from '../mdx/package.json';
import contentCollectionsPkg from '../content-collections/package.json';

writeFileSync(
  './versions.json',
  JSON.stringify({
    'fumadocs-core': corePkg.version,
    'fumadocs-ui': uiPkg.version,
    'fumadocs-mdx': mdxPkg.version,
    '@fumadocs/content-collections': contentCollectionsPkg.version,
  }),
);

console.log('version updated');

export default defineConfig({
  entry: ['./src/index.ts', './src/create-app.ts'],
  format: 'esm',
  target: 'node18',
});
