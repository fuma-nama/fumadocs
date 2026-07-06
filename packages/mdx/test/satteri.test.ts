import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { defineCollections, defineConfig } from '@/config';
import { buildConfig, type DocCollectionItem } from '@/config/build';
import { getSatteriOptions } from '@/config/build-satteri';
import { createCore } from '@/core';
import { buildMDX } from '@/loaders/mdx/build-mdx';

const baseDir = path.dirname(fileURLToPath(import.meta.url));

test('satteri compiler resolves preset options', async () => {
  const config = buildConfig(
    {
      docs: defineCollections({
        type: 'doc',
        compiler: 'satteri',
        dir: baseDir,
      }),
      default: defineConfig({
        satteriOptions: {
          rehypeCodeOptions: false,
        },
      }),
    },
    process.cwd(),
  );

  const options = await getSatteriOptions(
    config,
    config.collections.get('docs') as DocCollectionItem,
  );
  expect(options.features?.gfm).toBe(true);
  expect(options.mdastPlugins?.length).toBeGreaterThan(0);
});

test('buildMDX with satteri compiler', async () => {
  const core = createCore({
    configPath: 'source.config.ts',
    environment: 'test',
    outDir: '.source',
  });

  const config = buildConfig(
    {
      docs: defineCollections({
        type: 'doc',
        compiler: 'satteri',
        dir: baseDir,
        satteriOptions: {
          rehypeCodeOptions: {
            ...rehypeCodeDefaultOptions,
            lazy: false,
            langs: ['js'],
          },
        },
      }),
    },
    process.cwd(),
  );

  await core.init({ config });

  const collection = config.collections.get('docs') as DocCollectionItem;
  const compiled = await buildMDX(core, collection, {
    filePath: path.join(baseDir, 'satteri-fixture.mdx'),
    source: `---
title: Satteri test
---

# Hello Satteri

\`\`\`js
export const x = 1
\`\`\`
`,
    frontmatter: { title: 'Satteri test' },
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(compiled.value).toContain('export const frontmatter');
  expect(compiled.value).toContain('export const structuredData');
  expect(compiled.value).toContain('export const toc');
  expect(compiled.value).toContain('shiki');
  expect(compiled.value).toContain('Hello Satteri');
});

test('getMDXOptions rejects satteri collections', async () => {
  const config = buildConfig(
    {
      docs: defineCollections({
        type: 'doc',
        compiler: 'satteri',
        dir: baseDir,
      }),
    },
    process.cwd(),
  );

  const collection = config.collections.get('docs') as DocCollectionItem;
  expect(() => config.getMDXOptions(collection)).toThrow(/getSatteriOptions/);
});

test('buildMDX with satteri compiler resolves includes', async () => {
  const core = createCore({
    configPath: 'source.config.ts',
    environment: 'test',
    outDir: '.source',
  });

  const config = buildConfig(
    {
      docs: defineCollections({
        type: 'doc',
        compiler: 'satteri',
        dir: baseDir,
        satteriOptions: {
          rehypeCodeOptions: false,
        },
      }),
    },
    process.cwd(),
  );

  await core.init({ config });

  const fixture = path.join(baseDir, 'fixtures/remark-include/index.mdx');
  const collection = config.collections.get('docs') as DocCollectionItem;
  const dependencies: string[] = [];
  const compiled = await buildMDX(core, collection, {
    filePath: fixture,
    source: await fs.readFile(fixture, 'utf-8'),
    frontmatter: {},
    environment: 'bundler',
    isDevelopment: false,
    _compiler: { addDependency: (file) => dependencies.push(file) },
  });

  // full include + section by heading id
  expect(compiled.value).toContain('Hey there!');
  // section inside a JSX <section> tag
  expect(compiled.value).toContain('This is My Test.');
  // section inside a :::section directive
  expect(compiled.value).toContain('some content inside.');
  // code include with region extraction
  expect(compiled.value).toContain('language-ts');
  expect(dependencies).toContain(path.join(baseDir, 'fixtures/remark-include/test.mdx'));
  expect(dependencies).toContain(path.join(baseDir, 'fixtures/remark-include/code.ts'));
});
