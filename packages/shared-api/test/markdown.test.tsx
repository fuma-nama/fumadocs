import { createElement as h, isValidElement } from 'react';
import { renderToString } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { bundle } from '@fumadocs/json-schema/bundle';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createPageComponents } from '@/components/defaults';

const { Markdown } = createPageComponents({ shiki: defaultShikiFactory, components: {} });

const specs = [
  'apps/docs/scalar.yaml',
  'apps/docs/scalar-asyncapi.yaml',
  'examples/asyncapi/slack-rtm.yaml',
  'examples/openapi/openapi.yaml',
  'packages/openapi/test/fixtures/museum.yaml',
  'packages/openapi/test/fixtures/unkey.json',
  'packages/asyncapi/test/fixtures/streetlights.yaml',
];

const edgeCases = [
  // plain text
  '=',
  '===',
  'a | b',
  'foo]',
  'Hey!',
  'a:b',
  'http:/x',
  'ww.x',
  'www',
  'x 1. y',
  'a # b',
  'a > b',
  'a - b',
  'C#',
  '(a) "b" \'c\' {d} ^e %f $g',
  'a\xa0b',
  'a\u2028b',
  'a\ufeffb',
  'a\tb',
  '😀 漢字 é',
  // Markdown
  '',
  ' a',
  'a ',
  '\ta',
  'a\n===',
  'a\r===',
  'a\0b',
  '\xa0a',
  '\ufeffa',
  '1. a',
  '1) a',
  '- a',
  '+ a',
  '# a',
  '> a',
  '---',
  '&amp;',
  '*a*',
  '_a_',
  '`a`',
  '~a~',
  '<b>a</b>',
  '[a](b)',
  '![a](b)',
  'a\\!',
  'www.',
  'www.a.com',
  'WWW.A.COM',
  'https://a.com',
  'a@b.co',
];

function collect(node: unknown, out: string[]) {
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node)) {
    if (typeof value !== 'string') collect(value, out);
    else if (key === 'description' || key === 'summary' || key === 'title') out.push(value);
  }
}

/** the element tree of Markdown, as types, keys and props */
function render(md: string) {
  let out: unknown;
  function Probe() {
    out = Markdown({ md });
    return null;
  }
  renderToString(h(Probe));

  return tree(out);
}

function tree(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(tree);
  if (!isValidElement<Record<string, unknown>>(node)) return node;

  const props: Record<string, unknown> = {};
  for (const key in node.props) props[key] = tree(node.props[key]);
  return { type: node.type, key: node.key, props };
}

test('plain text renders like parsed Markdown', async () => {
  const strings = [...edgeCases];
  for (const file of specs) {
    collect(await bundle(fileURLToPath(new URL(`../../../${file}`, import.meta.url))), strings);
  }

  for (const md of strings) {
    // a trailing line ending changes nothing, but takes the parser
    expect(render(md), JSON.stringify(md)).toStrictEqual(render(`${md}\n`));
  }
});
