import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { getTypeUsages } from '@/utils/usage';
import { buildSchemaFromSDL } from '@/utils/build-schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

describe('getTypeUsages', () => {
  test('object type: returned by operations & member of fields', () => {
    expect(getTypeUsages(schema, 'Order')).toEqual({
      returnedBy: [
        { kind: 'query', name: 'orders' },
        { kind: 'mutation', name: 'createOrder' },
        { kind: 'mutation', name: 'legacyCreateOrder' },
        { kind: 'subscription', name: 'orderUpdated' },
      ],
      memberOf: [{ parent: 'Customer', field: 'orders' }],
      inputFor: [],
      argumentOf: [],
    });

    expect(getTypeUsages(schema, 'Customer')).toEqual({
      returnedBy: [{ kind: 'query', name: 'customer' }],
      memberOf: [{ parent: 'Order', field: 'customer' }],
      inputFor: [],
      argumentOf: [],
    });
  });

  test('input object types: input for operations', () => {
    expect(getTypeUsages(schema, 'OrderFilter')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [{ kind: 'query', name: 'orders' }],
      argumentOf: [],
    });

    expect(getTypeUsages(schema, 'OrderCreateInput')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [{ kind: 'mutation', name: 'createOrder' }],
      argumentOf: [],
    });
  });

  test('enum: member of output/input fields & argument of fields', () => {
    expect(getTypeUsages(schema, 'OrderStatus')).toEqual({
      returnedBy: [],
      memberOf: [
        { parent: 'Order', field: 'status' },
        { parent: 'OrderFilter', field: 'status' },
      ],
      inputFor: [],
      argumentOf: [{ parent: 'Customer', field: 'orders' }],
    });
  });

  test('custom scalar', () => {
    expect(getTypeUsages(schema, 'DateTime')).toEqual({
      returnedBy: [],
      memberOf: [
        { parent: 'Order', field: 'createdAt' },
        { parent: 'OrderFilter', field: 'after' },
      ],
      inputFor: [],
      argumentOf: [],
    });
  });

  test('interface & union return types', () => {
    expect(getTypeUsages(schema, 'Node')).toEqual({
      returnedBy: [{ kind: 'query', name: 'node' }],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    });

    expect(getTypeUsages(schema, 'SearchResult')).toEqual({
      returnedBy: [{ kind: 'query', name: 'search' }],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    });
  });

  test('type without usages', () => {
    // `Role` is only referenced from directive arguments
    expect(getTypeUsages(schema, 'Role')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    });
  });
});
