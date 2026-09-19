import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { type GraphQLComponents, GraphQLProvider } from '@/utils/create-page';
import { TypeProvider, type TypeUsages, useNamedType } from '@/type-docs';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const sdl = fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8');

const components: GraphQLComponents = {
  SchemaUI: () => null,
  Markdown: () => null,
  CodeBlock: () => null,
  Heading: () => null,
};

/** the usages `<TypeProvider />` derives for a named type */
function getTypeUsages(name: string): TypeUsages {
  let usages: TypeUsages | undefined;

  function Probe() {
    // oxlint-disable-next-line react/globals -- a single sync render, the value is read after it
    usages = useNamedType().relations.usages;
    return null;
  }

  renderToString(
    <GraphQLProvider sdl={sdl} shiki={defaultShikiFactory} components={components}>
      <TypeProvider name={name}>
        <Probe />
      </TypeProvider>
    </GraphQLProvider>,
  );

  return usages as TypeUsages;
}

describe('type usages', () => {
  test('object type: returned by operations & member of fields', () => {
    expect(getTypeUsages('Order')).toEqual({
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

    expect(getTypeUsages('Customer')).toEqual({
      returnedBy: [{ kind: 'query', name: 'customer' }],
      memberOf: [{ parent: 'Order', field: 'customer' }],
      inputFor: [],
      argumentOf: [],
    });
  });

  test('input object types: input for operations', () => {
    expect(getTypeUsages('OrderFilter')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [{ kind: 'query', name: 'orders' }],
      argumentOf: [],
    });

    expect(getTypeUsages('OrderCreateInput')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [{ kind: 'mutation', name: 'createOrder' }],
      argumentOf: [],
    });
  });

  test('enum: member of output/input fields & argument of fields', () => {
    expect(getTypeUsages('OrderStatus')).toEqual({
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
    expect(getTypeUsages('DateTime')).toEqual({
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
    expect(getTypeUsages('Node')).toEqual({
      returnedBy: [{ kind: 'query', name: 'node' }],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    });

    expect(getTypeUsages('SearchResult')).toEqual({
      returnedBy: [{ kind: 'query', name: 'search' }],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    });
  });

  test('type without usages', () => {
    // `Role` is only referenced from directive arguments
    expect(getTypeUsages('Role')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    });
  });
});
