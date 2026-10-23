import { expect, test } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkDirective from 'remark-directive';
import { defineCollections } from '@/config';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import { buildMDX } from '@/loaders/mdx/build';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/remark-include');

test('buildMDX resolves includes', async () => {
  const core = createCore({
    configPath: 'source.config.ts',
    environment: 'test',
    outDir: '.source',
  });
  const config = buildConfig(
    {
      docs: defineCollections({ type: 'doc', dir }),
      default: { mdxOptions: { rehypeCodeOptions: false, remarkPlugins: [remarkDirective] } },
    },
    process.cwd(),
  );
  await core.init({ config });

  const collection = config.collections.get('docs');
  if (collection?.type !== 'doc') throw new Error('missing collection');
  const dependencies: string[] = [];
  const { code } = await buildMDX(core, collection, {
    filePath: path.join(dir, 'page.mdx'),
    source: [
      '<include>./test.mdx#section-in-jsx</include>',
      '<include>./braces.md</include>',
      '<include>./code.ts#a</include>',
    ].join('\n\n'),
    environment: 'bundler',
    isDevelopment: false,
    _compiler: { addDependency: (file) => dependencies.push(file) },
  });

  expect(code).toContain('This is My Test.');
  // parsed as Markdown, not as an MDX expression
  expect(code).toContain('literal {braces} in Markdown');
  expect(code).toContain("console.log('hello world');");
  expect(dependencies.sort()).toEqual(
    ['braces.md', 'code.ts', 'test.mdx'].map((file) => path.join(dir, file)),
  );
});
