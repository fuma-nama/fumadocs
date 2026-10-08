import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import type { StructuredData, StructureOptions } from '@/remark-structure';
import { remarkInclude } from '@/remark-include';

async function compile(source: string, remarkStructureOptions?: StructureOptions) {
  const options = await applySatteriPreset({ rehypeCodeOptions: false, remarkStructureOptions })(
    'bundler',
  );
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

  it('records a blockquote once', async () => {
    const data = await compile('> quoted **text**\n>\n> - item\n');

    expect(data.contents).toEqual([
      { heading: undefined, content: '> quoted **text**\n>\n> - item' },
    ]);
  });

  it('exports empty structured data for documents without matches', async () => {
    const data = await compile('```js\nconst x = 1\n```');

    expect(data).toEqual({ contents: [], headings: [] });
  });

  it('slices authored syntax, flattening links and unlisted elements', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: false,
      remarkStructureOptions: { filterElement: (node) => node.name === 'Kept' },
    })('bundler');

    const result = await compileMdx({
      source:
        '## The `code` Title [#title]\n\nSee [the docs](/docs) with `code` and <Kept type="x">text</Kept> plus <Badge>**flat**</Badge>.\n',
      filePath: '/test.mdx',
      options,
    });
    const data = result.data?.structuredData as StructuredData;

    expect(data.headings).toEqual([{ id: 'title', content: 'The `code` Title' }]);
    expect(data.contents).toEqual([
      {
        heading: 'title',
        content: 'See the docs with `code` and <Kept type="x">text</Kept> plus **flat**.',
      },
    ]);
  });

  it('records included content in its blockquote', async () => {
    const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
    options.mdastPlugins = [remarkInclude(), ...(options.mdastPlugins ?? [])];
    const result = await compileMdx({
      source: '> Quote:\n>\n> <include>./content.mdx</include>\n',
      filePath: path.resolve(import.meta.dirname, './fixtures/remark-include/entry.mdx'),
      options,
    });

    expect(result.data?.structuredData?.contents).toEqual([
      {
        heading: undefined,
        content: '> Quote:\n>\n> ## Content Heading\n>\n> Some **bold-marker** content.',
      },
    ]);
  });

  it('keeps authored elements as a single-line tag', async () => {
    const data = await compile(
      `## API\n\n<TypeTable\n  type={{\n    percentage: {\n      description: 'The percentage of scroll position to display the roll button',\n      type: 'number',\n    },\n  }}\n/>\n`,
    );

    expect(data.contents).toMatchInlineSnapshot(`
      [
        {
          "content": "<TypeTable type="{ percentage: { description: 'The percentage of scroll position to display the roll button', type: '…" />",
          "heading": "api",
          "table": undefined,
        },
      ]
    `);
  });

  it('keeps the Markdown of table cells', async () => {
    const source = '| a | **b** |\n| :- | -: |\n| `x \\| y` | [link](/l) |\n| 2 | 3 |\n';
    const data = await compile(source);

    expect(data.contents).toMatchInlineSnapshot(`
      [
        {
          "content": "| a | **b** |
      | --- | --- |
      | \`x \\| y\` | link |",
          "heading": undefined,
          "table": "table-0",
        },
        {
          "content": "| a | **b** |
      | --- | --- |
      | 2 | 3 |",
          "heading": undefined,
          "table": "table-0",
        },
      ]
    `);
  });

  it('hides images, including replaced and removed ones', async () => {
    const source = 'A ![alt](./img.png) B ![ref][r] C\n\n[r]: ./img.png\n';

    for (const remarkImageOptions of [
      false as const,
      {},
      { useImport: false, onError: 'hide' as const },
    ]) {
      const options = await applySatteriPreset({
        rehypeCodeOptions: false,
        remarkImageOptions,
      })('bundler');
      const result = await compileMdx({ source, filePath: '/test.mdx', options });

      expect(result.data?.structuredData?.contents).toEqual([
        { heading: undefined, content: 'A  B  C' },
      ]);
    }
  });

  it('records elements inserted by plugins only through their structured data', async () => {
    const compileWith = async (data?: { structuredData: StructuredData }) => {
      const options = await applySatteriPreset({
        rehypeCodeOptions: false,
        mdastPlugins: [
          {
            name: 'insert',
            paragraph(node, ctx) {
              if (ctx.textContent(node) !== 'REPLACE') return;
              ctx.replaceNode(node, {
                type: 'mdxJsxFlowElement',
                name: 'TypeTable',
                attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: 'props' }],
                children: [],
                data,
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
      return result.data?.structuredData?.contents;
    };

    expect(await compileWith()).toEqual([]);
    expect(
      await compileWith({
        structuredData: { headings: [], contents: [{ heading: undefined, content: 'props' }] },
      }),
    ).toEqual([{ heading: 'api', content: 'props', table: undefined }]);
  });
});
