import { writeFileSync } from 'node:fs';
import { defineConfig } from 'tsup';
import corePkg from '../core/package.json';
import uiPkg from '../ui/package.json';
import mdxPkg from '../mdx/package.json';
import mdxRemotePkg from '../mdx-remote/package.json';
import contentCollectionsPkg from '../content-collections/package.json';

const versions = {
  'fumadocs-core': corePkg.version,
  'fumadocs-ui': uiPkg.version,
  'fumadocs-mdx': mdxPkg.version,
  '@fumadocs/mdx-remote': mdxRemotePkg.version,
  '@fumadocs/content-collections': contentCollectionsPkg.version,
};

writeFileSync(
  './src/versions.js',
  `export const versions = ${JSON.stringify(versions)}`,
);

console.log('Create-Fumadocs-App: versions.json updated');

export default defineConfig({
  entry: ['./src/index.ts', './src/create-app.ts'],
  format: 'esm',
  target: 'node18',
});
