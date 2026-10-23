import { describe, expect, test } from 'vitest';
import type { Element, ElementContent, Nodes, Properties, Text } from 'hast';
import type { Identifier, Node } from 'estree-jsx';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { nodeTypes } from '@mdx-js/mdx';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkRehype from 'remark-rehype';
import { type Components, type Evaluator, toJsx } from '@/utils/hast-to-jsx';

function h(tagName: string, properties: object = {}, ...children: ElementContent[]): Element {
  return { type: 'element', tagName, properties: properties as Properties, children };
}

function text(value: string): Text {
  return { type: 'text', value };
}

/** types, keys and props of React elements, without React internals */
function serialize(node: ReactNode): unknown {
  // in development, `jsxs()` freezes static children
  if (Array.isArray(node)) return { frozen: Object.isFrozen(node), items: node.map(serialize) };
  if (!isValidElement<Record<string, unknown>>(node)) return node;

  const { children, ...props } = node.props;
  return { type: node.type, key: node.key, props, children: serialize(children as ReactNode) };
}

interface SameOptions {
  components?: Partial<Components>;
  /** values of identifiers for an evaluator, which logs its calls */
  scope?: Record<string, unknown>;
  render?: boolean;
}

/** compares with `toJsxRuntime()`, trees are created per call as `toJsxRuntime()` may mutate them */
function expectSame(
  tree: () => Nodes,
  { components = {}, scope, render = true }: SameOptions = {},
) {
  const ourCalls: unknown[] = [];
  const originalCalls: unknown[] = [];
  const ours = toJsx(tree(), { components, evaluator: scope && createEvaluator(scope, ourCalls) });
  const original = toJsxRuntime(tree(), {
    ...JsxRuntime,
    components,
    createEvaluater: scope && (() => createEvaluator(scope, originalCalls)),
  });

  expect(serialize(ours)).toEqual(serialize(original));
  expect(ourCalls).toEqual(originalCalls);
  if (render) expect(renderToStaticMarkup(ours)).toBe(renderToStaticMarkup(original));
  return ours;
}

/** evaluates identifiers of `scope`, literals, members and arrays, programs to `scope.program` */
function createEvaluator(scope: Record<string, unknown>, calls: unknown[]): Evaluator {
  function evaluate(node: Node | null): unknown {
    if (node?.type === 'Identifier') return scope[node.name];
    if (node?.type === 'Literal') return node.value;
    if (node?.type === 'ArrayExpression') return node.elements.map(evaluate);
    if (node?.type === 'MemberExpression') {
      const key = node.computed ? evaluate(node.property) : (node.property as Identifier).name;
      return (evaluate(node.object) as Record<string, unknown>)[key as string];
    }
    throw new Error(`cannot evaluate ${node?.type}`);
  }

  return {
    evaluateExpression(expression) {
      calls.push(expression);
      return evaluate(expression);
    },
    evaluateProgram(program) {
      calls.push(program);
      return scope.program;
    },
  };
}

const mdxProcessor = remark()
  .use(remarkMdx)
  .use(remarkRehype, { passThrough: [...nodeTypes] });

function mdx(source: string): () => Nodes {
  return () => mdxProcessor.runSync(mdxProcessor.parse(source));
}

test('nodes', () => {
  expectSame(() => ({
    type: 'root',
    children: [
      { type: 'doctype' },
      { type: 'comment', value: 'comment' },
      h('p', {}, text('a'), h('b', {}, text('b')), text('')),
      h('p', {}, text('')),
      h('p', {}, h('br')),
    ],
  }));

  for (const node of [text('a'), text(''), { type: 'comment', value: 'x' } as const]) {
    expect(isValidElement(expectSame(() => node))).toBe(true);
  }
});

test('components', () => {
  const p = (props: object) => createElement('section', props);
  expectSame(() => h('div', {}, h('p', { id: 'a' }, text('a')), h('span')), { components: { p } });
  // inherited properties are not components
  expectSame(() => h('p', {}, text('a')), { components: Object.create({ p }) });
});

test('keys and children', () => {
  const ours = expectSame(() =>
    h('ul', {}, h('li', {}, text('a')), text('\n'), h('li'), h('p', {}, h('li')), h('li')),
  );
  expect(serialize(ours)).toMatchObject({
    children: { items: [{ key: 'li-0' }, '\n', { key: 'li-1' }, { key: 'p-0' }, { key: 'li-2' }] },
  });
});

describe('properties', () => {
  test('html names', () => {
    expectSame(
      () =>
        h('div', {
          className: ['a', '', 'b'],
          tabindex: 0,
          TabIndex: 1,
          HREF: '/a',
          ariaDescribedBy: 'a',
          'aria-hidden': 'true',
          'ARIA-LABEL': 'b',
          dataFooBar: 'a',
          'data-foo': 'b',
          DATAfoo: 'c',
          'dataA-b': 'd',
          htmlFor: 'a',
          for: 'b',
          httpEquiv: 'a',
          'accept-charset': 'b',
          classId: 'a',
          itemId: 'b',
          dateTime: 'c',
          onclick: 'a',
          unknownName: 'a',
          UNKNOWN: 'b',
          hidden: true,
          colSpan: 2,
          children: 'ignored',
          nullish: null,
          missing: undefined,
          nan: Number.NaN,
        }),
      { render: false },
    );
  });

  test('svg names', () => {
    expectSame(
      () =>
        h(
          'div',
          {},
          h(
            'SVG',
            { viewbox: '0 0 1 1', xmlnsXLink: 'a', className: 'b' },
            h('path', {
              strokeWidth: 1,
              'stroke-linecap': 'round',
              strokeDashArray: [1, 2],
              xLinkHref: '#a',
              'xlink:arcrole': 'b',
              tabindex: 0,
              dataType: 'a',
              typeOf: 'b',
              colspan: 1,
            }),
            h('svg', { fillRule: 'evenodd' }),
          ),
          // back to html
          h('td', { colspan: 2, 'stroke-width': 1 }),
        ),
      { render: false },
    );
  });

  test('comma and space separated', () => {
    expectSame(() =>
      h(
        'div',
        { className: ['a', 'b'] },
        h('input', { accept: ['a', 'b'] }),
        h('area', { coords: [1, 2, ''] }),
        h('svg', {}, h('glyph', { g1: ['a', 'b'], glyphName: ['a', ''] })),
        h('span', { g1: ['a', 'b'] }),
      ),
    );
  });
});

type StyledElement = ReactElement<{ style: object }>;

describe('styles', () => {
  const styles = [
    '',
    ' ; ',
    'color: red',
    'COLOR: Red; Background-Color: BLUE',
    '--shiki-light:#24292E;--shiki-dark:#E1E4E8',
    '--Custom-Prop: 1; --a#b: 2; --a/**/b: 3; --: 4',
    '-webkit-transition: none; -moz-box-sizing: border-box; -ms-transform: none; -MS-flex: 1',
    'color /* a */: red /* b */; /* c */ font-size: 1px',
    'co/**/lor: red',
    'color: red !important',
    'background: url("a;b"); content: \'a;b\'',
    'content: "a\\"b;c"; quotes: \'a\\\'',
    'a: (b;c) d; e: (f',
    ';color: red',
    'color:; font-size: 1px',
    'color: red} font-size: 1px',
    '*zoom: 1; a[b]: 2',
    '__proto__: red; 0: a',
  ];

  test.each(styles)('%j', (style) => {
    // key order too
    const ours = expectSame(() => h('div', { style }), { render: false }) as StyledElement;
    const original = toJsxRuntime(h('div', { style }), JsxRuntime) as StyledElement;
    expect(Object.entries(ours.props.style)).toEqual(Object.entries(original.props.style));
  });

  test('invalid', () => {
    for (const style of ['color', 'color: red; /* a', 'color /* a */ /* b */: red', 'a: b; c']) {
      expect(() => toJsxRuntime(h('div', { style }), JsxRuntime)).toThrow(
        'Cannot parse `style` attribute',
      );
      expect(() => toJsx(h('div', { style }))).toThrow('Cannot parse `style` attribute');
    }
  });

  test('objects pass through', () => {
    const style = { color: 'red' };
    expect((toJsx(h('div', { style })) as StyledElement).props.style).toBe(style);
  });
});

test('tables', () => {
  expectSame(() =>
    h(
      'table',
      {},
      text('\n'),
      h(
        'tbody',
        {},
        h(
          'tr',
          {},
          text(' \t'),
          h('td', { align: 'center', style: 'color: red' }, text(' ')),
          h('th', { align: 'left' }),
          h('td', { align: 'right', style: { color: 'blue' } }),
          h('td', { align: '' }),
          text('\u00a0'),
        ),
      ),
    ),
  );
});

describe('MDX', () => {
  const scope = {
    Foo: (props: object) => createElement('section', props),
    _Foo: 'aside',
    $foo: 'nav',
    SVG: 'g',
    Bar: { Baz: 'header', 'a-b': 'footer' },
    a: { b: 'em' },
    value: 'text',
    list: ['a', 'b'],
    props: { id: 'spread', children: 'from spread' },
    program: 'esm',
  };

  test('JSX elements', () => {
    expectSame(
      mdx(`<Foo id="a" hidden title={value} {...props}>text</Foo>

<Foo children="attribute" /> <Foo children={['a', 'b']} /> <Foo {...props} />

<Bar.Baz>member</Bar.Baz> <Bar.a-b>computed</Bar.a-b> <a.b>lowercase member</a.b> <_Foo>a</_Foo> <$foo>b</$foo>

<div id="b">literal</div> <a-b>dash</a-b> <x:y>namespace</x:y>

<>fragment <p>jsx</p></>

<div>
  <p>jsx</p>

  paragraph

  <p>jsx</p>
</div>`),
      { scope, components: { div: 'article', p: (props: object) => createElement('p', props) } },
    );
  });

  test('expressions and ESM', () => {
    expectSame(mdx('export const x = 1\n\n{value} and {list} {props.id}\n\n<p>{value}</p>'), {
      scope,
    });
    expectSame(mdx('{value}'), { scope });
    expectSame(mdx('export const x = 1'), { scope });
  });

  test('svg and tables', () => {
    const td = () => h('td', { colspan: 2, viewbox: '0 0 1 1' });
    expectSame(
      () => ({
        type: 'root',
        children: [
          { type: 'mdxJsxFlowElement', name: 'svg', attributes: [], children: [td()] },
          { type: 'mdxJsxFlowElement', name: 'SVG', attributes: [], children: [td()] },
          td(),
        ],
      }),
      { scope, render: false },
    );
    // JSX keeps white space
    expectSame(
      () => ({
        type: 'mdxJsxFlowElement',
        name: 'table',
        attributes: [],
        children: [
          text('\n'),
          h('tbody', {}, text(' '), {
            type: 'mdxJsxTextElement',
            name: 'tr',
            attributes: [],
            children: [text(' ')],
          }),
        ],
      }),
      { components: { table: 'div', tbody: 'div', tr: 'div' } },
    );
  });

  test('errors', () => {
    // tag names with literal attributes need no evaluator
    expectSame(mdx('<div id="a" hidden>text <b>bold</b></div>'));

    for (const source of [
      '{value}',
      'export const x = 1',
      '<Foo />',
      '<a.b />',
      '<div {...props} />',
      '<div title={value} />',
    ]) {
      expect(() => toJsxRuntime(mdx(source)(), JsxRuntime)).toThrow('Cannot handle MDX estrees');
      expect(() => toJsx(mdx(source)())).toThrow('Cannot handle MDX estrees');
    }

    const evaluator = createEvaluator(scope, []);
    const options = { ...JsxRuntime, createEvaluater: () => evaluator };
    const missing: Nodes = { type: 'mdxFlowExpression', value: 'value' };
    expect(() => toJsxRuntime(missing, options)).toThrow('Cannot handle MDX estrees');
    expect(() => toJsx(missing, { evaluator })).toThrow('Cannot handle MDX estrees');
    // empty expressions
    expect(() => toJsxRuntime(mdx('{/* a */}')(), options)).toThrow(TypeError);
    expect(() => toJsx(mdx('{/* a */}')(), { evaluator })).toThrow(TypeError);
  });
});

describe('spans as HTML', () => {
  /** same HTML as `toJsxRuntime()`, `html` tells if span content became one HTML string */
  function expectHtml(tree: () => Nodes, html: boolean, components: Partial<Components> = {}) {
    const ours = toJsx(tree(), { components });
    const original = toJsxRuntime(tree(), { ...JsxRuntime, components });
    expect(renderToStaticMarkup(ours)).toBe(renderToStaticMarkup(original));
    expect(JSON.stringify(serialize(ours)).includes('dangerouslySetInnerHTML')).toBe(html);
  }
  const line = (...children: ElementContent[]) => h('span', { class: 'line' }, ...children);

  test('highlighted code', () => {
    expectHtml(
      () =>
        h(
          'pre',
          { class: 'shiki' },
          h(
            'code',
            {},
            line(
              h(
                'span',
                { style: '--shiki-light:#24292E;--shiki-dark:#E1E4E8' },
                text('a <b> & "c"'),
              ),
            ),
            text('\n'),
            line(
              h(
                'span',
                { style: 'Background-Color : blue; -ms-flex: 1; /* x */ color:red;' },
                text("'d'"),
              ),
              text('e'),
              text(''),
              text('f'),
            ),
            text('\n'),
            line(
              h('span', {
                className: ['highlighted', '', 'word'],
                'data-line': 2,
                'data-x': ['a', 'b'],
              }),
              h('span', { style: '', 'data-y': '"' }, text('')),
            ),
          ),
        ),
      true,
    );
    // inline code, and lines under a component
    expectHtml(() => h('code', {}, h('span', { style: 'color:red' }, text('a'))), true);
    expectHtml(() => h('code', {}, line(h('span', {}, text('a')))), true, {
      code: (props: object) => createElement('kbd', props),
    });
  });

  test('other content stays elements', () => {
    const mdxElement: ElementContent = {
      type: 'mdxJsxTextElement',
      name: 'abbr',
      attributes: [],
      children: [],
    };
    expectHtml(() => h('code', {}, h('span', {}, text('a')), h('b', {}, text('b'))), false);
    expectHtml(() => h('code', {}, h('span', {}, mdxElement)), false);
    expectHtml(() => h('code', {}, h('span', { id: 'a' })), false);
    expectHtml(() => h('code', {}, h('span', { 'data-a': true })), false);
    expectHtml(() => h('code', {}, h('span', { style: { color: 'red' } as never })), false);
    expectHtml(() => h('code', {}, text('a'), h('span')), false);
    expectHtml(() => h('tr', {}, h('span', {}, text('a'))), false);
    expectHtml(() => h('code', {}, h('span', {}, text('a'))), false, {
      span: (props: object) => createElement('i', props),
    });
  });
});
