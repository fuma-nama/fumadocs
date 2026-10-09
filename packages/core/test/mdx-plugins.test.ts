import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import {
  parseCodeBlockAttributes,
  rehypeToc,
  remarkCodeTab,
  remarkDirectiveAdmonition,
  remarkHeading,
  remarkImage,
  remarkMdxFiles,
  remarkMdxMermaid,
  remarkNpm,
  remarkStructure,
  structure,
} from '@/mdx-plugins';
import { fileURLToPath } from 'node:url';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import type { RehypeTOCItemType } from '@/mdx-plugins/rehype-toc';
import { createProcessor } from '@mdx-js/mdx';
import { remarkSteps } from '@/mdx-plugins/remark-steps';
import remarkDirective from 'remark-directive';
import { remarkLLMs } from '@/mdx-plugins/remark-llms';
import { renderPlaceholder } from '@/mdx-plugins/remark-llms.runtime';
import type { Heading, Nodes, Root, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { VFile } from 'vfile';
import { embedSource, type Replacement, replaceSource } from '@/mdx-plugins/stringifier';
import { walk } from '@/mdx-plugins/utils';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('Remark Heading', async () => {
  const file = path.resolve(cwd, './fixtures/remark-heading.md');
  const content = await fs.readFile(file);

  const result = await remark().use(remarkHeading).process(content);

  await expect(result.data.toc).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-heading.output.json'),
  );
});

test('Remark Structure: Markdown of headings', () => {
  expect(structure('## The `code` Title [#title]\n\ntext').headings).toEqual([
    { id: 'title', content: 'The `code` Title' },
  ]);
});

test('Remark LLMs: heading IDs', async () => {
  const stringify = async (headingIds: boolean) => {
    const result = await remark()
      .use(remarkMdx)
      .use(remarkHeading)
      .use(remarkLLMs, { _data: true, headingIds })
      .process('# Title\n\n## Custom [#custom]\n');
    return result.data.markdown;
  };

  expect(await stringify(true)).toBe('# Title [#title]\n\n## Custom [#custom]\n');
  expect(await stringify(false)).toBe('# Title\n\n## Custom\n');
});

test('Remark Mdx Files', async () => {
  const file = path.resolve(cwd, './fixtures/remark-mdx-files.mdx');
  const content = await fs.readFile(file);

  const result = await remark().use(remarkMdx).use(remarkMdxFiles).process({
    path: file,
    value: content,
  });
  await expect(String(result.value)).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-mdx-files.output.mdx'),
  );
});

test('Remark Mdx Files: auto files in Markdown output', async () => {
  const file = new VFile({
    path: path.resolve(cwd, './fixtures/page.mdx'),
    value: '<auto-files dir="page-trees" pattern="basic.tree.json" />\n',
  });
  const processor = remark().use(remarkMdx).use(remarkMdxFiles).use(remarkLLMs, { _data: true });
  await processor.run(processor.parse(file), file);

  expect(file.data.markdown).toBe('```\nbasic.tree.json\n```\n');
});

test('Remark Structure', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/remark-structure.mdx'));
  const result = await remark()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkHeading)
    .use(remarkStructure)
    .process(content);

  await expect(JSON.stringify(result.data.structuredData, null, 2)).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-structure.output.json'),
  );
});

test('Remark Structure: records authored content only', async () => {
  // a paragraph inserted by a plugin has no source
  const insert = () => (tree: Root) => {
    tree.children.push({ type: 'paragraph', children: [{ type: 'text', value: 'Generated' }] });
  };

  const file = new VFile({
    value: '<Callout>Read the **guide** first.</Callout>\n',
    path: path.resolve(cwd, './fixtures/page.mdx'),
  });
  await createProcessor({ remarkPlugins: [insert, remarkStructure] }).process(file);

  expect(file.data.structuredData?.contents).toEqual([
    { heading: undefined, content: '<Callout>Read the **guide** first.</Callout>' },
  ]);
});

test('Remark Structure: embedded content and elements in records', async () => {
  const file = new VFile({
    value: '> Before\n>\n> <Embed />\n\nSee <Badge>**new**</Badge> feature.\n',
    path: path.resolve(cwd, './fixtures/page.mdx'),
  });
  const processor = remark()
    .use(remarkMdx)
    .use(() => (tree: Root, file: VFile) => {
      walk<Nodes>(tree, (node) => {
        if (node.type !== 'mdxJsxFlowElement' || node.name !== 'Embed') return;
        const source = 'Embedded *text*.';
        const { children } = remark().parse(source);
        embedSource(file, node, source, children);
        Object.assign(node, { type: 'root', children });
      });
    })
    .use(remarkStructure);
  await processor.run(processor.parse(file), file);

  // the embedded paragraph is in the record of its blockquote, elements become their Markdown content
  expect(file.data.structuredData?.contents).toEqual([
    { heading: undefined, content: '> Before\n>\n> Embedded *text*.' },
    { heading: undefined, content: 'See **new** feature.' },
  ]);
});

test('Remark Structure: a record per table row', () => {
  const { contents } = structure('| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |');

  expect(contents).toMatchInlineSnapshot(`
    [
      {
        "content": "| a   | b   |
    | --- | --- |
    | 1   | 2   |",
        "heading": undefined,
        "table": "table-0",
      },
      {
        "content": "| a   | b   |
    | --- | --- |
    | 3   | 4   |",
        "heading": undefined,
        "table": "table-0",
      },
    ]
  `);
});

test('Remark Code Tab: tab names keep records intact', async () => {
  const value = 'First paragraph.\n\n```ts tab="[npm](https://npmjs.com) <Icon />"\nnpm i\n```\n';
  const file = new VFile({ value, path: path.resolve(cwd, './fixtures/page.mdx') });
  const processor = remark()
    .use(remarkMdx)
    .use(remarkCodeTab, { parseMdx: true })
    .use(remarkStructure);
  await processor.run(processor.parse(file), file);

  expect(file.data.structuredData?.contents).toEqual([
    { heading: undefined, content: 'First paragraph.' },
  ]);
});

test('Remark Admonition', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/remark-admonition.md'));
  const processor = remark().use(remarkMdx).use(remarkDirective).use(remarkDirectiveAdmonition);
  let tree = processor.parse(content);
  tree = await processor.run(tree);

  await expect(tree).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-admonition.output.json'),
  );
});

test('Remark Steps', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/remark-steps.md'));
  const processor = remark().use(remarkSteps).use(remarkMdx);
  const result = await processor.process(content);

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-steps.output.md'),
  );
});

test('Remark Steps: tags in search records only', async () => {
  const file = new VFile(
    '### Install [step]\n\nRun it.\n\n### Configure [step] [#config]\n\n> ### Quoted [step]\n',
  );
  const processor = remark()
    .use(remarkHeading)
    .use(remarkSteps)
    .use(remarkStructure)
    .use(remarkLLMs, { _data: true });
  await processor.run(processor.parse(file), file);

  expect(file.data.structuredData).toEqual({
    headings: [
      { id: 'install-step', content: 'Install' },
      { id: 'config', content: 'Configure' },
    ],
    contents: [
      { heading: 'install-step', content: 'Run it.' },
      { heading: 'config', content: '> ### Quoted' },
    ],
  });
  expect(file.data.markdown).toBe(
    '### Install [step] [#install-step]\n\nRun it.\n\n### Configure [step] [#config]\n\n> ### Quoted [step] [#quoted-step]\n',
  );
});

test('Remark Image: With Path', async () => {
  const file = path.resolve(cwd, './fixtures/remark-image.md');
  const content = await fs.readFile(file);
  const processor = remark().use(remarkImage, { publicDir: path.resolve(cwd, './fixtures') });

  const result = await processor.run(processor.parse(content), {
    path: file,
  });

  await expect(result).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-image.output.json'),
  );
});

test('Remark Image: Without Import', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/remark-image.md'));
  const processor = remark().use(remarkImage, {
    publicDir: path.resolve(cwd, './fixtures'),
    useImport: false,
  });

  const result = await processor.run(processor.parse(content));
  await expect(result).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-image-without-import.output.json'),
  );
});

test('Remark Image: `publicDir` with URL', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/remark-image-public-dir.md'));
  const processor = remark().use(remarkImage, {
    publicDir: 'https://fumadocs.dev',
    useImport: false,
  });

  const result = await processor.run(processor.parse(content));
  await expect(result).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-image-public-dir.output.json'),
  );
});

test('Remark Image: hidden images', async () => {
  const value = 'A ![a](./missing.png) B ![b](./missing.png) C ![ref][r]\n\n[r]: ./missing.png\n';
  const run = async (options: object) => {
    const file = new VFile({ value, path: path.resolve(cwd, './fixtures/page.md') });
    const processor = remark()
      .use(remarkImage, { publicDir: path.resolve(cwd, './fixtures'), ...options })
      .use(remarkStructure);
    const tree = await processor.run(processor.parse(file), file);
    return { tree, contents: file.data.structuredData?.contents };
  };

  // images are never in search records
  const replaced = await run({});
  expect(replaced.contents).toEqual([{ heading: undefined, content: 'A  B  C' }]);

  const hidden = await run({ useImport: false, onError: 'hide' });
  expect(hidden.contents).toEqual([{ heading: undefined, content: 'A  B  C' }]);
  expect(hidden.tree.children[0]).toMatchObject({
    children: [{ value: 'A ' }, { value: ' B ' }, { value: ' C ' }, { type: 'imageReference' }],
  });
});

test('converts mermaid codeblock to MDX Mermaid component', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/remark-mdx-mermaid.md'));
  const result = await remark().use(remarkMdxMermaid).use(remarkMdx).process(content);

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-mdx-mermaid.output.mdx'),
  );
});

test('Rehype Toc', async () => {
  const content = await fs.readFile(path.resolve(cwd, './fixtures/rehype-toc.md'));

  const processor = createProcessor({
    remarkPlugins: [remarkHeading],
    rehypePlugins: [rehypeToc],
  });
  const result = await processor.process({ value: content });

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/rehype-toc.output.js'),
  );
});

test('Rehype Toc: step numbers survive rehype-raw', async () => {
  // `remarkSteps` sets `data-fd-step` as a number. `rehype-raw` re-parses the
  // tree from HTML, which turns it into the canonical `dataFdStep` string.
  const content = '### 1. Install\n\n<span>inline html</span>\n\n### 2. Configure\n\ndone';
  const steps = async (withRaw: boolean) => {
    let toc: RehypeTOCItemType[] | undefined;
    const processor = remark()
      .use(remarkHeading)
      .use(remarkSteps)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(withRaw ? [rehypeRaw] : [])
      .use(rehypeToc, { exportToc: { as: 'data' } })
      .use(() => (_tree, file) => {
        toc = file.data.rehypeToc;
      });
    await processor.run(processor.parse(content));
    return toc?.map((item) => item._step);
  };

  expect(await steps(false)).toEqual([1, 2]);
  expect(await steps(true)).toEqual([1, 2]);
});

test('parse meta strings', () => {
  expect(
    parseCodeBlockAttributes(
      `title="hello 'world'" tab='hello "world"' twoslash funny:invalid="" 'invalid'name="test"`,
    ),
  ).toMatchInlineSnapshot(`
    {
      "attributes": {
        "funny": null,
        "tab": "hello "world"",
        "title": "hello 'world'",
        "twoslash": null,
      },
      "rest": "   :invalid="" 'invalid'name="test"",
    }
  `);
});

test('Remark LLMs: filterElement', async () => {
  const result = await remark()
    .use(remarkMdx)
    .use(remarkLLMs, {
      _data: true,
      filterElement(node) {
        if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return true;
        return node.name !== 'Callout';
      },
    })
    .process('<Callout type="warn">dropped</Callout>\n\ntext after\n');

  expect(result.data.markdown).not.toContain('Callout');
  expect(result.data.markdown).not.toContain('dropped');
  expect(result.data.markdown).toContain('text after');
});

test('Remark LLMs: keep the authored source', async () => {
  const content = [
    "import { Callout } from './callout';",
    '',
    '# Heading',
    '',
    'Setext Heading',
    '==============',
    '',
    '## Custom [#custom-id]',
    '',
    '![Image](./image.png)',
    '',
    '<Unwrap>',
    '  Unwrapped **content**.',
    '',
    '  ```npm',
    '  npm i fumadocs-core',
    '  ```',
    '</Unwrap>',
    '',
    '- Item:',
    '',
    '  <Generated />',
    '',
    '> <Generated />',
    '',
    '<Callout title="Note">',
    '  With ![image](./nested.png).',
    '</Callout>',
  ].join('\n');

  const result = await remark()
    .use(remarkMdx)
    .use(() => (tree: Root, file: VFile) => {
      walk<Nodes>(tree, (node, index, parent) => {
        // generated nodes don't change the output
        if (node.type === 'image' && parent && index !== undefined)
          parent.children[index] = {
            type: 'mdxJsxTextElement',
            name: 'img',
            attributes: [],
            children: [],
          };
        if (node.type === 'mdxJsxFlowElement' && node.name === 'Generated')
          replaceSource(file, node, '**Generated**\n\nContent.');
      });
    })
    .use(remarkHeading)
    .use(remarkNpm)
    .use(remarkLLMs, {
      _data: true,
      mdxAsPlaceholder: ['Callout'],
      filterElement: (node) =>
        node.type !== 'mdxJsxFlowElement' || node.name !== 'Unwrap' || 'children-only',
    })
    .process(content);

  const rendered = await renderPlaceholder(result.data.markdown as string, {
    Callout: ({ attributes, children }) => `> **${attributes.title}** ${children}`,
  });
  expect(rendered).toMatchInlineSnapshot(`
    "# Heading [#heading]

    Setext Heading [#setext-heading]
    ==============

    ## Custom [#custom-id]

    ![Image](./image.png)

    Unwrapped **content**.

    \`\`\`npm
    npm i fumadocs-core
    \`\`\`

    - Item:

      **Generated**

      Content.

    > **Generated**
    >
    > Content.

    > **Note** With ![image](./nested.png).
    "
  `);
});

test('Remark LLMs: ignore generated nodes', async () => {
  const stringify = async (plugin?: (tree: Root) => void) => {
    const result = await remark()
      .use(remarkMdx)
      .use(() => plugin)
      .use(remarkHeading)
      .use(remarkLLMs, { _data: true })
      .process('# Title\n\nFirst paragraph.\n\n## Section\n\nLast paragraph.\n');
    return result.data.markdown;
  };
  const generated = () => {
    const tree = remark().parse('## Generated\n\nGenerated text.');
    walk<Nodes>(tree, (node) => {
      delete node.position;
    });
    return tree.children;
  };
  const expected = await stringify();

  expect(expected).toContain('## Section [#section]');
  for (const plugin of [
    (tree: Root) => void tree.children.push(...generated()),
    (tree: Root) => void tree.children.unshift(...generated()),
    (tree: Root) => void tree.children.splice(2, 0, ...generated()),
  ])
    expect(await stringify(plugin)).toBe(expected);
});

test('Remark LLMs: nested replacements', async () => {
  const content = ['<Outer>', '  # Inner', '', '  <Item />', '</Outer>', '', '<Item />', ''].join(
    '\n',
  );
  const stringify = async (plugin: (tree: Root, file: VFile) => void) => {
    const result = await remark()
      .use(remarkMdx)
      .use(() => plugin)
      .use(remarkHeading)
      .use(remarkLLMs, { _data: true })
      .process(content);
    return result.data.markdown;
  };
  const find = (tree: Root, name: string) => {
    const out: MdxJsxFlowElement[] = [];
    walk<Nodes>(tree, (node) => {
      if (node.type === 'mdxJsxFlowElement' && node.name === name) out.push(node);
    });
    return out;
  };

  // a string covers the edits inside made before it, and blocks those made after
  const expected = 'Outer.\n\nItem.\n';
  expect(
    await stringify((tree, file) => {
      replaceSource(file, find(tree, 'Outer')[0], 'Outer.');
      for (const item of find(tree, 'Item')) replaceSource(file, item, 'Item.');
    }),
  ).toBe(expected);
  expect(
    await stringify((tree, file) => {
      for (const item of find(tree, 'Item')) replaceSource(file, item, 'Item.');
      replaceSource(file, find(tree, 'Outer')[0], 'Outer.');
    }),
  ).toBe(expected);
  // the last edit of a node wins
  expect(
    await stringify((tree, file) => {
      replaceSource(file, find(tree, 'Outer')[0], 'Outer.');
      for (const item of find(tree, 'Item')) replaceSource(file, item, 'Item.');
      replaceSource(file, find(tree, 'Item')[1], 'Last.');
    }),
  ).toBe('Outer.\n\nLast.\n');
  // children moved out of a replaced node are gone with it
  expect(
    await stringify((tree, file) => {
      const outer = find(tree, 'Outer')[0];
      replaceSource(file, outer, 'Outer.');
      tree.children.splice(tree.children.indexOf(outer), 1, ...outer.children);
    }),
  ).toBe('Outer.\n\n<Item />\n');

  // a function applies the edits inside, made before or after it
  const composed = ':::note\n# Inner [#inner]\n\nItem.\n:::\n\nItem.\n';
  const wrap = (file: VFile, outer: MdxJsxFlowElement) =>
    replaceSource(file, outer, (s) => `:::note\n${s.inner(outer)}\n:::`);
  expect(
    await stringify((tree, file) => {
      wrap(file, find(tree, 'Outer')[0]);
      for (const item of find(tree, 'Item')) replaceSource(file, item, 'Item.');
    }),
  ).toBe(composed);
  expect(
    await stringify((tree, file) => {
      for (const item of find(tree, 'Item')) replaceSource(file, item, 'Item.');
      wrap(file, find(tree, 'Outer')[0]);
    }),
  ).toBe(composed);
  // with the last edit of each node inside
  expect(
    await stringify((tree, file) => {
      const item = find(tree, 'Item')[0];
      replaceSource(file, item, 'Before.');
      wrap(file, find(tree, 'Outer')[0]);
      replaceSource(file, item, 'After.');
    }),
  ).toBe(':::note\n# Inner [#inner]\n\nAfter.\n:::\n\n<Item />\n');
  // or picks the children it needs
  expect(
    await stringify((tree, file) => {
      const outer = find(tree, 'Outer')[0];
      replaceSource(file, outer, (s) => s.stringify(outer.children[0]));
    }),
  ).toBe('# Inner [#inner]\n\n<Item />\n');
});

test('Remark LLMs: replaced headings', async () => {
  const stringify = async (text: (heading: Heading) => Replacement) => {
    const result = await remark()
      .use(remarkMdx)
      .use(() => (tree: Root, file: VFile) => {
        walk<Nodes>(tree, (node) => {
          if (node.type === 'heading') replaceSource(file, node, text(node));
        });
      })
      .use(remarkHeading)
      .use(remarkLLMs, { _data: true })
      .process('## Heading\n\nText.\n');
    return result.data.markdown;
  };

  // its ID is part of the node, not of its children
  expect(await stringify((node) => (s) => `## ${s.inner(node).toUpperCase()}`)).toBe(
    '## HEADING\n\nText.\n',
  );
  expect(await stringify((node) => (s) => `${s.stringify(node)} (new)`)).toBe(
    '## Heading [#heading] (new)\n\nText.\n',
  );
});

test('Remark LLMs: replacements of embedded content', async () => {
  const result = await remark()
    .use(remarkMdx)
    .use(() => (tree: Root, file: VFile) => {
      const target = tree.children[1];
      const source = 'First <A />.\n\nSecond <B />.\n\n- <C />';
      const embedded = remark().use(remarkMdx).parse(source);
      const { children } = embedded;
      // before and after embedding
      walk<Nodes>(embedded, (node) => {
        if (node.type === 'mdxJsxTextElement' && node.name === 'A') replaceSource(file, node, 'a');
      });
      embedSource(file, target, source, children);
      Object.assign(target, { type: 'root', children });
      walk<Nodes>(tree, (node) => {
        if (node.type === 'mdxJsxTextElement' && node.name === 'B') replaceSource(file, node, 'b');
        if (node.type === 'mdxJsxFlowElement' && node.name === 'C')
          replaceSource(file, node, 'Multi\n\nline');
      });
    })
    .use(remarkLLMs, { _data: true })
    .process('Before.\n\n<Embed />\n\nAfter.\n');

  expect(result.data.markdown).toBe(
    'Before.\n\nFirst a.\n\nSecond b.\n\n- Multi\n\n  line\n\nAfter.\n',
  );
});

test('Remark LLMs: edits of plugins', async () => {
  const content = [
    '# Title',
    '',
    '<Note>',
    '  Inside <Replace />.',
    '</Note>',
    '',
    '- Item:',
    '',
    '  <Embed />',
    '',
    '<Swap />',
    '',
  ].join('\n');

  let embedded: RootContent[] = [];
  const result = await remark()
    .use(remarkMdx)
    .use(() => (tree: Root, file: VFile) => {
      walk<Nodes>(tree, (node, index, parent) => {
        if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
        if (node.name === 'Replace') replaceSource(file, node, '**replaced**');
        if (node.name === 'Embed') {
          const source = '## Embedded\n\nFrom *another* source.';
          embedded = remark().parse(source).children;
          embedSource(file, node, source, embedded);
          Object.assign(node, { type: 'root', children: embedded });
        }
        if (node.name === 'Swap' && parent && index !== undefined) {
          replaceSource(file, node, 'Swapped.');
          parent.children.splice(index, 1, { type: 'paragraph', children: [] });
        }
      });
      // ignored without a position
      replaceSource(file, { type: 'paragraph', children: [] }, 'broken');
    })
    .use(remarkHeading)
    .use(remarkLLMs, { _data: true, mdxAsPlaceholder: ['Note'] })
    .process(content);

  const rendered = await renderPlaceholder(result.data.markdown as string, {
    Note: ({ children }) => `> ${children}`,
  });
  expect(rendered).toMatchInlineSnapshot(`
    "# Title [#title]

    > Inside **replaced**.

    - Item:

      ## Embedded [#embedded]

      From *another* source.

    Swapped.
    "
  `);
  // positions of embedded content are kept
  expect(embedded[0].position?.start).toEqual({ line: 1, column: 1, offset: 0 });
});

test('Remark LLMs: placeholder', async () => {
  const file = path.resolve(cwd, './fixtures/remark-llms.mdx');
  const content = await fs.readFile(file);
  const result = await remark()
    .use(remarkMdx)
    .use(remarkLLMs, { _data: true, mdxAsPlaceholder: ['MyPage'] })
    .process(content);

  const markdown = result.data.markdown as string;
  const rendered = await renderPlaceholder(markdown, {
    async MyPage({ attributes, children }) {
      return `title: ${attributes.title}, children: ${children}`;
    },
  });
  await expect(
    `\`\`\`md\n${markdown}\n\`\`\`\n\n\`\`\`md\n${rendered}\n\`\`\``,
  ).toMatchFileSnapshot(path.resolve(cwd, './fixtures/remark-llms.output.md'));
});
