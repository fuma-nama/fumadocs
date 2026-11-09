import { expect, test } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkDirective from 'remark-directive';
import { defineCollections } from '@/config';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import { buildMDX } from '@/loaders/mdx/build';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/remark-include');

async function setup() {
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
  return { core, collection };
}

test('buildMDX resolves includes', async () => {
  const { core, collection } = await setup();
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

test('buildMDX with importsOnly keeps the imports of includes and plugins', async () => {
  const { core, collection } = await setup();
  const { code } = await buildMDX(core, collection, {
    filePath: path.join(dir, 'page.mdx'),
    source: [
      "import { A } from './a';",
      '# Title',
      '> <include>./esm.mdx</include>',
      '![image](./image.png)',
    ].join('\n\n'),
    environment: 'bundler',
    isDevelopment: false,
    importsOnly: true,
  });

  expect(code).toMatchInlineSnapshot(`
    "import {Fragment as _Fragment, jsx as _jsx} from "react/jsx-runtime";
    export const structuredData = props => ({
      headings: [{
        id: "title",
        content: "Title"
      }],
      contents: [{
        heading: "title",
        content: "> import { Included } from './included';\\n>\\n> Included content."
      }]
    });
    import __img0 from "./image.png";
    import {A} from './a';
    import {Included} from './included';
    export const toc = props => [];
    function _createMdxContent(props) {
      return _jsx(_Fragment, {});
    }
    export default function MDXContent(props = {}) {
      const {wrapper: MDXLayout} = props.components || ({});
      return MDXLayout ? _jsx(MDXLayout, {
        ...props,
        children: _jsx(_createMdxContent, {
          ...props
        })
      }) : _createMdxContent(props);
    }
    "
  `);
});
