import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type HastNode, type HastPluginDefinition, mdxToJs } from 'satteri';
import { islandPlugin } from '@/island-plugin';
import { FumadocsIsland } from '@/island';

interface Captured {
  tree: string;
  /** source of the `props` attribute */
  props: string;
  slots: Record<string, HastNode[]>;
}

async function compile(source: string) {
  let island: Captured | undefined;
  const capture: HastPluginDefinition = {
    name: 'capture',
    mdxJsxFlowElement: {
      filter: ['_FumadocsIsland'],
      visit(node) {
        const slots: Captured['slots'] = {};
        const values: Record<string, string> = {};
        for (const attribute of node.attributes) {
          if (
            attribute.type === 'mdxJsxAttribute' &&
            attribute.value &&
            typeof attribute.value === 'object'
          )
            values[attribute.name] = (attribute.value as { value: string }).value;
        }
        for (const child of node.children) {
          const name = (child as { attributes: { value: string }[] }).attributes[0].value;
          slots[name] = (child as { children: HastNode[] }).children;
        }
        island = { tree: values.tree, props: values.props, slots };
      },
    },
  };

  const { code } = await mdxToJs(source, {
    hastPlugins: [islandPlugin('/island.js'), capture],
    jsxImportSource: 'astro',
  });
  return { code, island: island! };
}

/** render with slots as placeholders, `contentProps` are the props of `<Content />` */
function render({ tree, props, slots }: Captured, contentProps: object = {}): string {
  const placeholders: Record<string, unknown> = {};
  for (const name in slots) placeholders[name] = createElement('astro-slot', { name });

  return renderToStaticMarkup(
    createElement(FumadocsIsland, {
      tree: new Function(`return ${tree}`)() as string,
      props: new Function('props', `return ${props}`)({ components: {}, ...contentProps }),
      ...placeholders,
    }),
  );
}

describe('content island', () => {
  it('wraps the body and imports the island', async () => {
    const { code, island } = await compile(
      "import { X } from './x';\n\nexport const y = 1;\n\n# Hello\n\nWorld",
    );

    expect(code).toContain('import { FumadocsIsland as _FumadocsIsland } from "/island.js"');
    expect(code).toContain('"client:load": true');
    expect(code).toContain('import { X } from "./x"');
    expect(render(island)).toBe('<h1>Hello</h1><p>World</p>');
  });

  it('keeps context between provided components', async () => {
    const { island } = await compile(
      `<Tabs items={['a', 'b']}>\n  <Tab value="a">**A**</Tab>\n  <Tab value="b">B</Tab>\n</Tabs>`,
    );

    expect(render(island)).toBe(
      '<div data-tabs="a,b"><section data-active="true"><strong>A</strong></section><section data-active="false">B</section></div>',
    );
  });

  it('renders highlighted code, images, imports and expressions with Astro', async () => {
    const { code, island } = await compile(
      [
        "import { Local } from './local';",
        '',
        '```js',
        'const a = 1;',
        '```',
        '',
        '![image](./image.png)',
        '',
        '<Local />',
        '',
        '{1 + 1}',
      ].join('\n'),
    );

    expect(render(island)).toBe(
      '<pre data-codeblock=""><code class="language-js"><astro-slot name="s0"></astro-slot></code></pre><p><astro-slot name="s1"></astro-slot></p><astro-slot name="s2"></astro-slot><astro-slot name="s3"></astro-slot>',
    );
    expect(island.slots.s0).toEqual([{ type: 'text', value: 'const a = 1;\n' }]);
    expect(island.slots.s1[0]).toMatchObject({ type: 'element', tagName: 'img' });
    expect(island.slots.s2[0]).toMatchObject({ type: 'mdxJsxFlowElement', name: 'Local' });
    expect(island.slots.s3[0]).toMatchObject({ type: 'mdxFlowExpression', value: '1 + 1' });
    // moved into slots, not kept in the body
    expect(code.match(/_jsx\(Local,/g)).toHaveLength(1);
    expect(code.match(/1 \+ 1/g)).toHaveLength(1);
  });

  it('moves JSX in props into slots', async () => {
    const { island } = await compile(
      `<Card title="Card" icon={<span>icon</span>} {...{ children: 'text' }} />`,
    );

    expect(render(island)).toBe('<a data-card="Card"><astro-slot name="s0"></astro-slot>text</a>');
    expect(island.slots.s0[0]).toMatchObject({
      type: 'mdxFlowExpression',
      value: '<span>icon</span>',
    });
  });

  it('converts HTML attributes of JSX elements', async () => {
    const { island } = await compile(
      '<div class="box" style="color: red" hidden>\n  <svg viewBox="0 0 1 1" stroke-width="2"><path d="M0" /></svg>\n</div>',
    );

    expect(render(island)).toBe(
      '<div class="box" style="color:red" hidden=""><svg viewBox="0 0 1 1" stroke-width="2"><path d="M0"></path></svg></div>',
    );
  });

  it('passes the props of content to wrapper', async () => {
    const { island } = await compile('Hello');

    expect(render(island, { lang: 'cn', children: null })).toBe(
      '<main lang="cn"><p>Hello</p></main>',
    );
  });

  it('resolves member components', async () => {
    const { island } = await compile('Text with <UI.Badge>badge</UI.Badge>.');

    expect(render(island)).toBe('<p>Text with <mark>badge</mark>.</p>');
  });

  it('throws on unknown components', async () => {
    const { island } = await compile('<Unknown />');

    expect(() => render(island)).toThrow(/Component "Unknown"/);
  });
});
