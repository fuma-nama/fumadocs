import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import type { StructuredData } from '@/remark-structure';

async function compile(source: string) {
  const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
  const result = await compileMdx({ source, filePath: '/test.mdx', options });
  return result.data?.structuredData as StructuredData;
}

describe('remark-structure', () => {
  it('collects headings and contents', async () => {
    const data = await compile('## Overview\n\nfirst paragraph\n\nsecond paragraph');

    expect(data.headings).toEqual([{ id: 'overview', content: 'Overview' }]);
    expect(data.contents).toEqual([
      { heading: 'overview', content: 'first paragraph' },
      { heading: 'overview', content: 'second paragraph' },
    ]);
  });

  it('assigns content before any heading to no heading', async () => {
    const data = await compile('intro text\n\n## Section\n\nbody');

    expect(data.contents[0]).toEqual({ heading: undefined, content: 'intro text' });
    expect(data.contents[1]).toEqual({ heading: 'section', content: 'body' });
  });

  it('records a table row with the header row', async () => {
    const data = await compile(
      '| a | **b** |\n| :- | -: |\n| `x \\| y` | [link](/l) |\n| 2 | 3 |\n\n| only |\n| - |',
    );

    expect(data.contents).toMatchInlineSnapshot(`
      [
        {
          "content": "| a      | b    |
      | ------ | ---- |
      | x \\| y | link |",
          "heading": undefined,
        },
        {
          "content": "| a | b |
      | - | - |
      | 2 | 3 |",
          "heading": undefined,
        },
        {
          "content": "| only |
      | ---- |",
          "heading": undefined,
        },
      ]
    `);
  });

  it('exports empty structured data for documents without matches', async () => {
    const data = await compile('```js\nconst x = 1\n```');

    expect(data).toEqual({ contents: [], headings: [] });
  });
});

describe('remark-structure: stringify', () => {
  it('slices authored syntax, flattening links and unlisted elements', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: false,
      remarkStructureOptions: {
        stringify: {
          filterElement: (node) => node.name === 'Kept',
        },
      },
    })('bundler');

    const result = await compileMdx({
      source:
        '## Title\n\nSee [the docs](/docs) with `code` and <Kept type="x">text</Kept> plus <Badge>flat</Badge>.\n',
      filePath: '/test.mdx',
      options,
    });
    const data = result.data?.structuredData as StructuredData;

    expect(data.headings).toEqual([{ id: 'title', content: 'Title' }]);
    expect(data.contents).toEqual([
      {
        heading: 'title',
        content: 'See the docs with `code` and <Kept type="x">text</Kept> plus flat.',
      },
    ]);
  });

  it('keeps authored elements as a single-line tag', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: false,
      remarkStructureOptions: {
        stringify: { filterElement: (node) => node.name === 'TypeTable' },
      },
    })('bundler');
    const result = await compileMdx({
      source: `## API\n\n<TypeTable\n  type={{\n    percentage: {\n      description: 'The percentage of scroll position to display the roll button',\n      type: 'number',\n    },\n  }}\n/>\n`,
      filePath: '/test.mdx',
      options,
    });

    expect((result.data?.structuredData as StructuredData).contents).toMatchInlineSnapshot(`
      [
        {
          "content": "<TypeTable type="{ percentage: { description: 'The percentage of scroll position to display the roll button', type: '…" />",
          "heading": "api",
        },
      ]
    `);
  });

  it('slices table rows with the authored header row', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: false,
      remarkStructureOptions: { stringify: true },
    })('bundler');
    const result = await compileMdx({
      source: '| a | **b** |\n| :- | -: |\n| `x \\| y` | [link](/l) |\n| 2 | 3 |\n',
      filePath: '/test.mdx',
      options,
    });

    expect((result.data?.structuredData as StructuredData).contents).toMatchInlineSnapshot(`
      [
        {
          "content": "| a | **b** |
      | :- | -: |
      | \`x \\| y\` | link |",
          "heading": undefined,
        },
        {
          "content": "| a | **b** |
      | :- | -: |
      | 2 | 3 |",
          "heading": undefined,
        },
      ]
    `);
  });

  it('synthesizes plugin-inserted elements from their fields', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: false,
      remarkStructureOptions: {
        stringify: { filterElement: (node) => node.name === 'TypeTable' },
      },
      mdastPlugins: [
        {
          name: 'synthesize',
          paragraph(node, ctx) {
            if (ctx.textContent(node) !== 'REPLACE') return;
            ctx.replaceNode(node, {
              type: 'mdxJsxFlowElement',
              name: 'TypeTable',
              attributes: [
                {
                  type: 'mdxJsxAttribute',
                  name: 'type',
                  value: { type: 'mdxJsxAttributeValueExpression', value: '{ name: "string" }' },
                },
              ],
              children: [],
            });
          },
        },
      ],
    })('bundler');

    const result = await compileMdx({
      source: '## API\n\nREPLACE\n',
      filePath: '/test.mdx',
      options,
    });
    const data = result.data?.structuredData as StructuredData;

    expect(data.contents).toEqual([
      { heading: 'api', content: '<TypeTable type="{ name: &quot;string&quot; }" />' },
    ]);
  });
});
