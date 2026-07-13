import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { SchemaProvider } from '@/components/playground/schema';
import { FieldSet } from '@/components/playground/inputs';
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
        h(FieldSet, {
          field: doc.components.schemas.Planet as never,
          fieldName: ['body'],
          collapsible: false,
          isRequired: true,
        }),
      ),
    );
  }

  const html = renderToString(h(Harness));
  expect(html.length).toBeGreaterThan(100);
  expect(html).not.toContain('$ref-value');
});
