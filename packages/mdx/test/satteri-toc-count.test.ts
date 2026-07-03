import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { defineCollections } from '@/config';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import { buildMDX } from '@/loaders/mdx/build-mdx';
import { applySatteriPreset } from '@fumadocs/satteri/preset';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code';

const baseDir = path.dirname(fileURLToPath(import.meta.url));

test('satteri exports toc once', async () => {
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
        satteriOptions: applySatteriPreset({
          rehypeCodeOptions: {
            inline: 'tailing-curly-colon',
            themes: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
            transformers: [...(rehypeCodeDefaultOptions.transformers ?? [])],
          },
        }),
      }),
    },
    process.cwd(),
  );

  await core.init({ config });

  const collection = config.collections.get('docs')!;
  const compiled = await buildMDX(core, collection, {
    filePath: path.join(baseDir, 'satteri-toc-count.mdx'),
    source: '# One\n\n## Two',
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(compiled.value.match(/export const toc/g)).toHaveLength(1);
});

test('tabbed code blocks become CodeBlockTabs', async () => {
  const core = createCore({
    configPath: 'source.config.ts',
    environment: 'test',
    outDir: '.source',
  });

  const config = buildConfig(
    {
      blog: defineCollections({
        type: 'doc',
        compiler: 'satteri',
        dir: baseDir,
        satteriOptions: applySatteriPreset({
          rehypeCodeOptions: false,
          remarkCodeTabOptions: { parseMdx: true },
        }),
      }),
    },
    process.cwd(),
  );

  await core.init({ config });

  const collection = config.collections.get('blog')!;
  const compiled = await buildMDX(core, collection, {
    filePath: path.join(baseDir, 'tab-test.mdx'),
    source: '```txt tab="Server"\na\n```\n\n```txt tab="Client"\nb\n```',
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(compiled.value).toContain('CodeBlockTabs');
  expect(compiled.value).not.toMatch(/_jsx\(Tab,/);
});

test('includeProcessedMarkdown exports _markdown', async () => {
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
        postprocess: { includeProcessedMarkdown: true },
        satteriOptions: { rehypeCodeOptions: false },
      }),
    },
    process.cwd(),
  );

  await core.init({ config });

  const collection = config.collections.get('docs')!;
  const compiled = await buildMDX(core, collection, {
    filePath: path.join(baseDir, 'llms-test.mdx'),
    source: '# Hello\n\nWorld',
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(compiled.value).toContain('export const _markdown');
});
