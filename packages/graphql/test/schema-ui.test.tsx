import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { getOperationField } from '@/utils/schema';
import { generateGraphQLSchemaUI } from '@/utils/generate-schema-ui';

const renderers = {
  renderMarkdown: (md: string) => md,
  renderDirectives: () => null,
  renderArguments: () => null,
  renderEnumValues: () => null,
};

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

/**
 * `description`/`infoTags` are ReactNode, keep only the shape-relevant parts.
 */
function summarize(generated: ReturnType<typeof generateGraphQLSchemaUI>) {
  const refs: Record<string, unknown> = {};

  for (const [key, data] of Object.entries(generated.refs)) {
    refs[key] = {
      type: data.type,
      aliasName: data.aliasName,
      deprecated: data.deprecated,
      props: 'props' in data ? data.props.map((prop) => prop.name) : undefined,
    };
  }

  return { $root: generated.$root, refs };
}

describe('generateGraphQLSchemaUI', () => {
  test('Customer object with cyclic references', () => {
    const type = schema.getType('Customer');
    expect(type).toBeDefined();

    const generated = generateGraphQLSchemaUI(schema, { type: type! }, renderers);

    // cycle: Customer.orders -> Order -> Order.customer -> Customer, each
    // field ref is registered exactly once instead of recursing forever
    expect(generated.refs['Customer.orders']).toMatchObject({
      typeName: 'Order',
      aliasName: '[Order!]!',
      type: 'object',
    });
    expect(generated.refs['Order.customer']).toMatchObject({
      typeName: 'Customer',
      aliasName: 'Customer!',
      type: 'object',
    });
    // deprecated field
    expect(generated.refs['Customer.email']).toMatchObject({ deprecated: true });

    expect(summarize(generated)).toMatchSnapshot();
  });

  test('orders query return type keeps wrapper alias', () => {
    const field = getOperationField(schema, 'query', 'orders');
    expect(field).toBeDefined();

    const generated = generateGraphQLSchemaUI(schema, { type: field!.type }, renderers);

    // wrapper collapsing: `[Order!]!` collapses into the named type while the
    // GraphQL-style annotation is kept in `aliasName`
    expect(generated.refs.$root).toMatchObject({
      typeName: 'Order',
      aliasName: '[Order!]!',
      type: 'object',
    });

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
    expect(root.infoTags).toHaveLength(1);
  });
});
