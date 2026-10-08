import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createElement, type FC, type ReactNode } from 'react';
import { asMarkdown, md, renderToMarkdown } from 'fumadocs-core/server';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkInclude } from '@/remark-include';
import { remarkLlms } from '@/remark-llms';
import { type Replacement, replaceSource, type Stringifier } from '@/stringifier';
import { defineMdastPlugin, type MdastPluginInput } from 'satteri';

test('remark-llms handles many root blocks', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: '# A\n\n' + Array.from({ length: 100 }, (_, i) => `Paragraph ${i}.`).join('\n\n'),
    filePath: '/large.mdx',
    options,
  });

  const markdown = result.data?.markdown as string;
  expect(markdown).toContain('Paragraph 0.');
  expect(markdown).toContain('Paragraph 99.');
});

test('remark-llms keeps the authored source form', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: [
      'import { X } from "./x";',
      '',
      '## Title [#custom]',
      '',
      '```npm',
      'npm i fumadocs-core',
      '```',
      '',
      '![alt](/img.png)',
      '',
    ].join('\n'),
    filePath: '/doc.mdx',
    options,
  });

  expect(result.data?.markdown).toMatchInlineSnapshot(`
    "## Title [#custom]

    \`\`\`npm
    npm i fumadocs-core
    \`\`\`

    ![alt](/img.png)
    "
  `);
});

test('remark-llms splices included content', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkInclude(), remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: '# Entry\n\n<include>./content.mdx</include>\n\nAfter.\n',
    filePath: path.resolve(import.meta.dirname, './fixtures/remark-include/entry.mdx'),
    options,
  });

  const markdown = result.data?.markdown as string;
  expect(markdown).toContain('bold-marker');
  expect(markdown).not.toContain('<include>');
  expect(markdown).not.toContain('Included Doc');
  expect(markdown).toContain('After.');
});

test('included content goes through the plugins', async () => {
  const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
  // includes first, as in fumadocs-mdx
  options.mdastPlugins = [remarkInclude(), ...(options.mdastPlugins ?? []), remarkLlms()];

  const result = await compileMdx({
    source: '<include>./content.mdx</include>\n',
    filePath: path.resolve(import.meta.dirname, './fixtures/remark-include/entry.mdx'),
    options,
  });

  expect(result.data?.markdown).toBe(
    '## Content Heading [#content-heading]\n\nSome **bold-marker** content.\n',
  );
  expect(result.data?.structuredData).toEqual({
    headings: [{ id: 'content-heading', content: 'Content Heading' }],
    contents: [{ heading: 'content-heading', content: 'Some **bold-marker** content.' }],
  });
});

test('remark-llms function output keeps replaced content in elements', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkInclude(), remarkLlms({ output: 'function' })],
  })('bundler');

  const result = await compileMdx({
    source:
      '<Callout>\n  <include>./content.mdx</include>\n</Callout>\n\n<Step>\n\n```npm\nnpm i fumadocs-core\n```\n\n</Step>\n',
    filePath: path.resolve(import.meta.dirname, './fixtures/remark-include/entry.mdx'),
    options,
  });

  expect(result.code).toContain(
    'children: "\\n## Content Heading\\n\\nSome **bold-marker** content.\\n"',
  );
  // the code block replaced by `remarkNpm`
  expect(result.code).toContain('children: "\\n```npm\\nnpm i fumadocs-core\\n```\\n"');
});

test('remark-llms composes nested edits', async () => {
  type Node = Parameters<Stringifier['inner']>[0] & { name?: string | null };
  const replace = (name: string, text: (node: Node) => Replacement) =>
    defineMdastPlugin({
      name: `replace-${name}`,
      options: { position: true },
      mdxJsxFlowElement(node, ctx) {
        if (node.name === name) replaceSource(ctx, node, text(node));
      },
    });
  const stringify = async (plugins: MdastPluginInput[]) => {
    const result = await compileMdx({
      source: '<Outer>\n  <Item />\n</Outer>\n\n<Item />\n',
      filePath: '/doc.mdx',
      options: { mdastPlugins: [...plugins, remarkLlms()] },
    });
    return result.data?.markdown;
  };

  // a string covers the edits inside made before it, and blocks those made after
  const outer = replace('Outer', () => 'Outer.');
  const item = replace('Item', () => 'Item.');
  expect(await stringify([outer, item])).toBe('Outer.\n\nItem.\n');
  expect(await stringify([item, outer])).toBe('Outer.\n\nItem.\n');

  // a function applies the edits inside, the last edit of a node wins
  const wrap = replace('Outer', (node) => (s) => `[${s.inner(node)}]`);
  expect(
    await stringify([replace('Item', () => 'Before.'), wrap, replace('Item', () => 'After.')]),
  ).toBe('[After.]\n\nAfter.\n');
});

test('remark-llms keeps replacements inside their containers', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkInclude(), remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: [
      'Setext',
      '======',
      '',
      '- Item:',
      '',
      '  <include>./content.mdx</include>',
      '',
      '> <include>./code.ts</include>',
      '',
    ].join('\n'),
    filePath: path.resolve(import.meta.dirname, './fixtures/remark-include/entry.mdx'),
    options,
  });

  expect(result.data?.markdown).toMatchInlineSnapshot(`
    "Setext [#setext]
    ======

    - Item:

      ## Content Heading

      Some **bold-marker** content.

    > \`\`\`ts
    > export function main() {
    >   console.log('main-marker');
    > }
    >
    > // #region setup
    > export function setup() {
    >   console.log('region-marker');
    > }
    > // #endregion
    >
    > export const other = 1;
    > \`\`\`
    "
  `);
});

test('remark-llms shows generated content of replaced nodes', async () => {
  const { remarkAutoTypeTable } = await import('@/remark-auto-type-table');
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [
      remarkAutoTypeTable({
        renderType: (type) => ({ type: 'text', value: type }),
        renderMarkdown: (md) => ({ type: 'text', value: md }),
      }),
      remarkLlms(),
    ],
  })('bundler');

  const result = await compileMdx({
    source: '## Reference\n\n<auto-type-table path="./type-table.ts" name="TestProps" />\n',
    filePath: path.resolve(import.meta.dirname, './fixtures/page.mdx'),
    options,
  });

  expect(result.data?.markdown).toMatchInlineSnapshot(`
    "## Reference [#reference]

    ### TestProps

    | Prop | Type | Description |
    | --- | --- | --- |
    | \`name?\` | \`string\` | The visible name. Default: \`"hello"\` |
    | \`enabled\` | \`union\` | Whether it is enabled |
    "
  `);
});

test('remark-llms function output exports a component', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms({ output: 'function' })],
  })('bundler');

  const result = await compileMdx({
    source: [
      '## Hello World',
      '',
      'Content with <Badge type="info">inline **bold**</Badge> element.',
      '',
      '<Callout title="Note" count={1 + 1} open>',
      '  Some *content* here.',
      '',
      '  <Tabs items={["a", "b"]}>',
      '    nested',
      '  </Tabs>',
      '</Callout>',
      '',
      'Ending paragraph.',
      '',
    ].join('\n'),
    filePath: '/doc.mdx',
    options,
  });

  await expect(result.code).toMatchFileSnapshot('./fixtures/remark-llms-jsx.output.js');

  const evalFile = path.resolve(import.meta.dirname, './fixtures/remark-llms-jsx.out.js');
  await fs.writeFile(evalFile, result.code);
  const { _markdown: Md } = (await import(evalFile)) as {
    _markdown: FC<{ components?: Record<string, unknown> }>;
  };
  await fs.rm(evalFile);

  async function Callout({
    title,
    count,
    children,
  }: {
    title?: string;
    count?: number;
    children?: ReactNode;
  }) {
    if (asMarkdown()) return md.linePrefix('> ')`**${title} (${count})**\n${children}`;
    return null;
  }

  await expect(renderToMarkdown(createElement(Md, { components: { Callout } }))).resolves
    .toMatchInlineSnapshot(`
    "## Hello World [#hello-world]

    Content with <Badge type="info">inline **bold**</Badge> element.

    > **Note (2)**
    >
    > Some *content* here.
    >
    > <Tabs items={["a","b"]}>
    > nested
    > </Tabs>

    Ending paragraph."
  `);
});
