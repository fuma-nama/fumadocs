import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { SchemaProvider } from '@/components/playground/schema';
import { FieldRows } from '@/components/playground/fields';
import { StfProvider, useStf } from '@fumari/stf';

test('renders playground fields of circular schemas', () => {
  const bundled = {
    openapi: '3.1.0',
    components: {
      schemas: {
        Planet: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            // union types trigger schema validation in `useFieldInfo`
            description: { type: ['string', 'null'] },
            satellites: {
              type: 'array',
              items: { $ref: '#/components/schemas/Satellite' },
            },
          },
        },
        Satellite: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            planet: { $ref: '#/components/schemas/Planet' },
          },
        },
      },
    },
  };
  const doc = createMagicProxy(bundled) as never as typeof bundled;

  function Harness() {
    const stf = useStf({ defaultValues: { body: { name: 'Mars' } } });

    return h(
      StfProvider,
      { value: stf, children: null },
      h(
        SchemaProvider,
        {
          docRoot: doc as never,
          writeOnly: true,
          readOnly: false,
          children: null,
        },
        h(FieldRows, {
          entry: {
            fieldName: ['body'],
            name: 'body',
            schema: doc.components.schemas.Planet as never,
          },
          onNavigate() {},
        }),
      ),
    );
  }

  const html = renderToString(h(Harness));
  expect(html).toContain('satellites');
  expect(html).not.toContain('$ref-value');
});

test('renders a union of const members as one select labelled by their titles', () => {
  const schema = {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        oneOf: [
          { const: 'prj_1', title: 'Docs Site' },
          { const: 'prj_2', title: 'Mobile App' },
        ],
      },
    },
  };

  function Harness() {
    const stf = useStf({ defaultValues: { body: { project: 'prj_2' } } });

    return h(
      StfProvider,
      { value: stf, children: null },
      h(
        SchemaProvider,
        { docRoot: {} as never, writeOnly: true, readOnly: false, children: null },
        h(FieldRows, {
          entry: { fieldName: ['body'], name: 'body', schema: schema as never },
          onNavigate() {},
        }),
      ),
    );
  }

  const html = renderToString(h(Harness));
  expect(html).not.toContain('aria-label="Type"');
  expect(html).toMatch(/id="_body\._project"[^>]*><span class="truncate">Mobile App</);
});

test('renders a union of const members and string as an input suggesting their titles', () => {
  const schema = {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        anyOf: [
          { const: 'prj_1', title: 'Docs Site' },
          { const: 'prj_2', title: 'Mobile App' },
          { type: 'string' },
        ],
      },
    },
  };

  function Harness() {
    const stf = useStf({ defaultValues: { body: { project: 'prj_typed' } } });

    return h(
      StfProvider,
      { value: stf, children: null },
      h(
        SchemaProvider,
        { docRoot: {} as never, writeOnly: true, readOnly: false, children: null },
        h(FieldRows, {
          entry: { fieldName: ['body'], name: 'body', schema: schema as never },
          onNavigate() {},
        }),
      ),
    );
  }

  const html = renderToString(h(Harness));
  expect(html).not.toContain('aria-label="Type"');
  expect(html).toMatch(/<input[^>]*id="_body\._project"[^>]*>/);
  const input = html.match(/<input[^>]*id="_body\._project"[^>]*>/)?.[0];
  expect(input).toContain('role="combobox"');
  expect(input).toContain('value="prj_typed"');
});
