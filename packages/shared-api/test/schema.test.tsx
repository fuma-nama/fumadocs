import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { generateSchemaUI } from '@fumadocs/json-schema/react';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createPageComponents } from '@/components/defaults';
import { SchemaUI } from '@/components/schema';

const generated = generateSchemaUI({
  root: {
    type: 'object',
    properties: {
      pet: {
        oneOf: [
          { title: 'Cat', type: 'object', properties: { meow: { type: 'string' } } },
          { title: 'Dog', type: 'object', properties: { bark: { type: 'string' } } },
        ],
      },
    },
  },
  renderMarkdown: (md) => md,
  renderCodeblock: () => null,
});

test('renders the properties of body', () => {
  const html = renderToString(h(SchemaUI, { rootId: 'body', name: 'body', as: 'body', generated }));

  expect(html).toContain('id="body"');
  expect(html).toContain('pet');
  // members of the union open from its type
  expect(html).not.toContain('meow');
});

test('shows the first member of unions', () => {
  const pet = generated.refs[generated.$root];
  if (pet.type !== 'object') throw new Error('unexpected schema');
  const html = renderToString(
    h(SchemaUI, {
      rootId: 'pet',
      name: 'pet',
      as: 'body',
      generated: { $root: pet.props[0].$type, refs: generated.refs },
    }),
  );

  expect(html).toContain('meow');
  expect(html).not.toContain('bark');
});

test('renders the root property with its type', () => {
  const html = renderToString(h(SchemaUI, { rootId: 'param', name: 'param', generated }));

  expect(html).toContain('id="param"');
  expect(html).toContain('aria-expanded="false"');
});

test('renders images of Markdown', () => {
  const { Markdown } = createPageComponents({ shiki: defaultShikiFactory, components: {} });
  const html = renderToString(h(Markdown, { md: '![flow](https://example.com/flow.png)' }));

  expect(html).toContain('<p><img src="https://example.com/flow.png" alt="flow"/></p>');
});
