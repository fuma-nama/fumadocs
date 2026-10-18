import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { generateGraphQLSchemaUI } from '@/utils/generate-schema-ui';

const renderers = {
  renderMarkdown: (md: string) => md,
  renderDirectives: () => null,
  renderEnumValues: () => null,
};

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

/**
 * The refs reachable from the root, `description`/`infoTags` are ReactNode, keep only the shape-relevant parts.
 */
function summarize({ $root, refs }: ReturnType<typeof generateGraphQLSchemaUI>) {
  const out: Record<string, unknown> = {};
  const queue = [$root];

  for (const key of queue) {
    if (key in out) continue;
    const data = refs[key];
    out[key] = {
      type: data.type,
      aliasName: data.aliasName,
      deprecated: data.deprecated,
      props: 'props' in data ? data.props.map((prop) => prop.name) : undefined,
    };
    if (data.type === 'object') for (const prop of data.props) queue.push(prop.$type);
    if (data.type === 'or') for (const item of data.items) queue.push(item.$type);
  }

  return { $root, refs: out };
}

describe('generateGraphQLSchemaUI', () => {
  test('refs of a wrapped type and its cyclic references', () => {
    const field = schema.getQueryType()!.getFields().orders;
    const generated = generateGraphQLSchemaUI(schema, { type: field.type }, renderers);
    const { refs } = generated;

    // generated when read
    expect(Object.keys(refs)).toEqual([]);
    // `[Order!]!` collapses into the named type, `aliasName` keeps the annotation
    expect(refs.$root).toMatchObject({ typeName: 'Order', aliasName: '[Order!]!', type: 'object' });
    // cycle: Order.customer -> Customer -> Customer.orders -> Order
    expect(refs['Order.customer']).toMatchObject({
      typeName: 'Customer',
      aliasName: 'Customer!',
      type: 'object',
    });
    expect(refs['Customer.orders']).toMatchObject({ typeName: 'Order', aliasName: '[Order!]!' });
    expect(refs['Customer.email']).toMatchObject({ deprecated: true });

    expect(summarize(generated)).toMatchSnapshot();
  });

  test('descriptions of named types', () => {
    const { refs } = generateGraphQLSchemaUI(schema, { type: schema.getType('Order')! }, renderers);

    // built-in scalars are described by the spec
    expect(refs['Order.id'].description).toBeUndefined();
    // enums and custom scalars describe the fields typed as them
    expect(refs['Order.status'].description).toBe('The status of an order.');
    expect(refs['Order.createdAt'].description).toBe('Time at which the order was created.');
  });

  test('arguments of a field', () => {
    const { $root, refs } = generateGraphQLSchemaUI(schema, 'Query.orders()', renderers);

    // the arguments of an operation as the root
    expect($root).toBe('Query.orders()');
    expect(refs.$root).toBeUndefined();
    expect(refs['Query.orders()']).toMatchObject({
      type: 'object',
      props: [{ name: 'filter', $type: 'Query.orders(filter:)', required: false }],
    });
    // a field opens its arguments from a tag
    expect(refs['Customer.orders'].infoTags).toContainEqual({
      label: 'Arguments',
      value: 'status, first',
      open: { name: 'orders(…)', $ref: 'Customer.orders()' },
    });
    expect(refs['Customer.orders(first:)'].infoTags).toEqual([{ label: 'Default', value: '10' }]);
    // not keys of the schemas, like the properties tools read
    expect(refs['Missing.field']).toBeUndefined();
    expect(refs.$$typeof).toBeUndefined();
  });

  test('implementations of interface', () => {
    const { refs } = generateGraphQLSchemaUI(schema, { type: schema.getType('Node')! }, renderers);

    expect(refs.$root.infoTags).toContainEqual({
      label: 'Implemented by',
      list: ['Customer', 'Order'],
    });
  });

  test('a root documented by the page', () => {
    const { refs } = generateGraphQLSchemaUI(
      schema,
      { type: schema.getType('Node')!, description: '' },
      renderers,
    );

    expect(refs.$root.description).toBeUndefined();
    expect(refs.$root.infoTags).toEqual([]);
  });

  test('one-of input object', () => {
    const oneOf = buildSchemaFromSDL(`
      input OrderLookup @oneOf {
        id: ID
        number: Int
      }

      type Query {
        order(by: OrderLookup!): String
      }
    `);
    const { refs } = generateGraphQLSchemaUI(
      oneOf,
      { type: oneOf.getType('OrderLookup')! },
      renderers,
    );
    const root = refs.$root;

    expect(root.type === 'object' && root.props.map((prop) => prop.required)).toEqual([
      false,
      false,
    ]);
    expect(root.infoTags).toEqual([{ label: 'Exactly one of', list: ['id', 'number'] }]);
  });
});
