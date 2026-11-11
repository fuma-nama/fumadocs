import { type ComponentType, createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type HastNode, type HastPluginDefinition, mdxToJs } from 'satteri';
import { islandPlugin } from '@/island-plugin';
import { createIsland, type IslandNode } from '@/island';
import { ContentIsland, Slot } from '@/mdx-runtime';
import components from './fixtures/components';

const FumadocsIsland = createIsland(components);

interface Captured {
  tree: string;
  /** source of the `props` attribute */
  props: string;
  slots: Record<string, HastNode[]>;
}

async function compile(source: string, plugins: HastPluginDefinition[] = []) {
  let island: Captured | undefined;
  const capture: HastPluginDefinition = {
    name: 'capture',
    mdxJsxFlowElement: {
      filter: ['_ContentIsland'],
      visit(node) {
        const values: Record<string, string> = {};
        const attributes = (element: { attributes: unknown[] }) => {
          for (const attribute of element.attributes as typeof node.attributes) {
            if (
              attribute.type === 'mdxJsxAttribute' &&
              attribute.value &&
              typeof attribute.value === 'object'
            )
              values[attribute.name] = (attribute.value as { value: string }).value;
          }
        };
        const element = node.children[0] as unknown as {
          attributes: unknown[];
          children: { attributes: { value: string }[]; children: HastNode[] }[];
        };
        attributes(node);
        attributes(element);
        const slots: Captured['slots'] = {};
        for (const child of element.children) slots[child.attributes[0].value] = child.children;
        island = { tree: values.tree, props: values.props, slots };
      },
    },
  };

  const { code } = await mdxToJs(source, {
    hastPlugins: [...plugins, islandPlugin('/island.js', '/runtime.js'), capture],
    jsxImportSource: 'astro',
  });
  return { code, island: island! };
}

/** the vnode of the island: slots of the document are placeholders, `contentProps` are the props of `<Content />` */
function createContent({ tree, props, slots }: Captured, contentProps: object = {}) {
  const content = { components: {}, ...contentProps };
  const slotProps: Record<string, unknown> = {};
  for (const name in slots)
    slotProps[name] = Object.assign([createElement('astro-slot', { name })], { $$slot: true });

  return ContentIsland({
    tree: new Function('_Slot', 'props', `return ${tree}`)(Slot, content) as IslandNode[],
    components: content.components,
    children: {
      type: FumadocsIsland,
      props: { props: new Function('props', `return ${props}`)(content), ...slotProps },
    },
  }) as unknown as { type: ComponentType<object>; props: Record<string, unknown> };
}

function toHtml(vnode: { type: ComponentType<object>; props: Record<string, unknown> }): string {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(vnode.props))
    props[key] =
      Array.isArray(value) && '$$slot' in value
        ? isValidElement(value[0])
          ? value[0]
          : createElement('astro-slot', { name: key })
        : value;
  return renderToStaticMarkup(createElement(vnode.type, props));
}

/** render with slots as placeholders */
function render(island: Captured, contentProps: object = {}): string {
  return toHtml(createContent(island, contentProps));
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

  it('renders the `components` of `<Content />` with Astro', async () => {
    const { island } = await compile(
      `[link](./a.mdx "title") text\n\n## **Bold**\n\n![image](./image.png)`,
    );
    const a = () => null;
    const h2 = () => null;
    const content = createContent(island, { components: { a, h2 } });

    expect(toHtml(content)).toBe(
      '<p><astro-slot name="c0"></astro-slot> text</p><astro-slot name="c1"></astro-slot><p><astro-slot name="s0"></astro-slot></p>',
    );
    const [link] = content.props.c0 as { type: unknown; props: object }[];
    expect(link.type).toBe(a);
    expect(link.props).toEqual({ href: './a.mdx', title: 'title', children: ['link'] });

    // what it wraps is not only text: another island
    const [heading] = content.props.c1 as { type: unknown; props: { children: object } }[];
    expect(heading.type).toBe(h2);
    expect(toHtml(heading.props.children as never)).toBe('<strong>Bold</strong>');
  });

  it('moves the slots wrapped by the `components` of `<Content />` to their island', async () => {
    const { island } = await compile(`[![image](./image.png)](./a.mdx)`);
    const content = createContent(island, { components: { a: () => null } });
    const [link] = content.props.c0 as { props: { children: object } }[];

    expect(content.props).not.toHaveProperty('s0');
    expect(toHtml(link.props.children as never)).toBe('<astro-slot name="s0"></astro-slot>');
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

  it('keeps code with components in the island', async () => {
    const popup: HastPluginDefinition = {
      name: 'popup',
      element: {
        filter: ['code'],
        visit(node, ctx) {
          ctx.appendChild(node, {
            type: 'element',
            tagName: 'Card',
            properties: { title: 'type' },
            children: [],
          });
        },
      },
    };
    const { island } = await compile('```js\nconst a = 1;\n```', [popup]);

    expect(render(island)).toBe(
      '<pre data-codeblock=""><code class="language-js">const a = 1;\n<a data-card="type"></a></code></pre>',
    );
    expect(island.slots).toEqual({});
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

  it('gives a heading its ID from code', async () => {
    // like `rehypeHeading` writes a heading whose ID renders from code
    const { island } = await compile('<h2 id={`on-${props.framework}`}>Setup</h2>');

    expect(render(island, { framework: 'astro' })).toBe('<h2 id="on-astro">Setup</h2>');
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

  it('ignores comments', async () => {
    const { island } = await compile('{/* comment */}\n\nText {/* inline */}');

    expect(render(island)).toBe('<p>Text </p>');
    expect(island.slots).toEqual({});
  });

  it('throws on provided components in expressions', async () => {
    await expect(compile("{['a'].map((v) => <Card title={v} />)}")).rejects.toThrow(
      /<Card> in a JavaScript expression/,
    );
    await expect(compile('<Card title="a" icon={<UI.Badge />} />')).rejects.toThrow(/<UI>/);

    const { island } = await compile("import { X } from './x';\n\n{[1].map(() => <X />)}");
    expect(Object.keys(island.slots)).toEqual(['s0']);
  });

  it('throws on functions in props', async () => {
    const { island } = await compile('<Card title="Card" onClick={() => {}} />');

    expect(() => render(island)).toThrow(/must be serializable.*\.onClick/);
  });

  it('keeps dates and maps in props', async () => {
    const { island } = await compile(
      "<Time date={new Date('2020-01-01T00:00:00Z')} counts={new Map([['a', 1]])} />",
    );

    expect(render(island)).toBe('<time data-count="1">2020-01-01T00:00:00.000Z</time>');
  });

  it('throws on unknown components', async () => {
    const { island } = await compile('<Unknown />');

    expect(() => render(island)).toThrow(/Component "Unknown"/);
  });
});
