import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { applySatteriPreset } from '@fumadocs/satteri/preset';
import { defineCollections, defineConfig } from '@/config';
import { buildConfig, type DocCollectionItem } from '@/config/build';
import { createCore } from '@/core';
import { buildMDX } from '@/loaders/mdx/build';

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

  const input = config.global.satteriOptions;
  const preset = typeof input === 'function' ? await input('bundler') : input;
  const options = await applySatteriPreset(preset)('bundler');
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

  expect(compiled.code).toContain('export const frontmatter');
  expect(compiled.code).toContain('export const structuredData');
  expect(compiled.code).toContain('export const toc');
  expect(compiled.code).toContain('shiki');
  expect(compiled.code).toContain('Hello Satteri');
});

test('buildMDX with default mdx compiler', async () => {
  const core = createCore({
    configPath: 'source.config.ts',
    environment: 'test',
    outDir: '.source',
  });

  const config = buildConfig(
    {
      docs: defineCollections({
        type: 'doc',
        dir: baseDir,
      }),
    },
    process.cwd(),
  );

  await core.init({ config });

  const collection = config.collections.get('docs') as DocCollectionItem;
  const compiled = await buildMDX(core, collection, {
    filePath: path.join(baseDir, 'mdx-fixture.mdx'),
    source: `---
title: MDX test
---

# Hello MDX
`,
    frontmatter: { title: 'MDX test' },
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(compiled.code).toMatch(/export (const|let) frontmatter/);
  expect(compiled.code).toContain('Hello MDX');
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
  expect(compiled.code).toContain('Hey there!');
  // section inside a JSX <section> tag
  expect(compiled.code).toContain('This is My Test.');
  // section inside a :::section directive
  expect(compiled.code).toContain('some content inside.');
  // code include with region extraction
  expect(compiled.code).toContain('language-ts');
  expect(dependencies).toContain(path.join(baseDir, 'fixtures/remark-include/test.mdx'));
  expect(dependencies).toContain(path.join(baseDir, 'fixtures/remark-include/code.ts'));
});

test('satteri compiler exports lastModified', async () => {
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
        // a custom resolver keeps the test independent of git history
        lastModified: async () => new Date('2025-11-18T00:00:00.000Z'),
      }),
    },
    process.cwd(),
  );
  await core.init({ config });

  const compiled = await buildMDX(core, config.collections.get('docs') as DocCollectionItem, {
    filePath: path.join(baseDir, 'satteri-fixture.mdx'),
    source: '# Hello',
    frontmatter: {},
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(compiled.code).toContain(
    `export const lastModified = new Date(${new Date('2025-11-18T00:00:00.000Z').getTime()});`,
  );
});
