import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { getOperationField } from '@/utils/schema';
import { generateGraphQLSchemaUI } from '@/ui/schema-ui';

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

    const generated = generateGraphQLSchemaUI(schema, { type: type! });

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

    const generated = generateGraphQLSchemaUI(schema, { type: field!.type });

    // wrapper collapsing: `[Order!]!` collapses into the named type while the
    // GraphQL-style annotation is kept in `aliasName`
    expect(generated.refs.$root).toMatchObject({
      typeName: 'Order',
      aliasName: '[Order!]!',
      type: 'object',
    });

    expect(summarize(generated)).toMatchSnapshot();
  });
});
