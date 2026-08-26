import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createElement, type FC, type ReactNode } from 'react';
import { asMarkdown, md, renderToMarkdown } from 'fumadocs-core/server';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkInclude } from '@/remark-include';
import { remarkLlms } from '@/remark-llms';

const paragraph = '# Title\n\n' + 'Lorem ipsum dolor sit amet.\n\n'.repeat(200);

test('remark-llms exports processed markdown once', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: paragraph,
    filePath: '/doc.mdx',
    options,
  });

  expect(typeof result.data?.markdown).toBe('string');
  expect(result.data?.markdown).toContain('Title');
});

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

test('remark-llms jsx mode exports a component', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms({ jsx: true })],
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
