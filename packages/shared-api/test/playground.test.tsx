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
  expect(html).toContain('Mobile App');
  // no type switch between the members
  expect(html).not.toContain('&quot;prj_1&quot; | &quot;prj_2&quot;');
});
