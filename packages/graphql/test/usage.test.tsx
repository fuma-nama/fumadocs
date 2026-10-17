import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import type { GraphQLObjectType } from 'graphql';
import { describe, expect, test } from 'vitest';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { type GraphQLComponents, GraphQLProvider } from '@/utils/create-page';
import { TypeProvider, type TypeUsages, useNamedType } from '@/type-docs';
import { TypeDocs } from '@/ui/type-docs';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import * as Schema from '@/utils/schema';

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

/** the text of the usages card on the page of a named type */
function renderUsages(name: string, schema = sdl): { html: string; text: string } {
  const html = renderToString(
    <GraphQLProvider
      sdl={schema}
      shiki={defaultShikiFactory}
      components={components}
      typeLinks={(type) => `/docs/types/${type}`}
      operationLinks={(kind, operation) => `/docs/${kind}/${operation}`}
    >
      <TypeDocs name={name} />
    </GraphQLProvider>,
  );
  const card = html.slice(html.indexOf('<dl'), html.indexOf('</dl>'));

  return { html: card, text: card.replace(/<[^>]+>/g, '') };
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

  test('usages card', () => {
    const order = renderUsages('Order');
    // operations with their kinds, fields with their parents
    expect(order.text).toBe(
      'Member ofSearchResultReturned byQUERYordersMUTATIONcreateOrderMUTATIONlegacyCreateOrderSUBSCRIPTIONorderUpdatedField ofCustomer.orders',
    );
    expect(order.html).toContain('href="/docs/types/SearchResult"');
    expect(order.html).toContain('href="/docs/subscription/orderUpdated"');
    expect(order.html).toContain('href="/docs/types/Customer"');
    // deprecated operations are struck through
    expect(order.html).toContain(
      '<code class="line-through"><a href="/docs/mutation/legacyCreateOrder"',
    );
    expect(order.html.split('line-through')).toHaveLength(2);

    expect(renderUsages('Node').text).toBe('Implemented byCustomerOrderReturned byQUERYnode');
    expect(renderUsages('OrderFilter').text).toBe('Input forQUERYorders');
    expect(renderUsages('OrderStatus').text).toBe(
      'Field ofOrder.statusOrderFilter.statusArgument ofCustomer.orders',
    );
  });

  test('deprecated fields in usages', () => {
    const { html, text } = renderUsages(
      'Money',
      `
      type Money { amount: Float! }
      type Order {
        total: Money! @deprecated(reason: "Use \`price\` instead.")
        price: Money!
      }
      type Query { order: Order }
    `,
    );

    expect(text).toBe('Field ofOrder.priceOrder.total');
    expect(html).toMatch(/<code class="line-through"><a [^>]*>Order<\/a>.<!-- -->total<\/code>/);
    expect(html.split('line-through')).toHaveLength(2);
  });

  test('a field is listed once when several of its arguments use the type', () => {
    const schema = buildSchemaFromSDL(`
      input Tag { name: String }
      type Item { tags(include: Tag, exclude: Tag): [String!] }
      type Query {
        search(include: Tag, exclude: Tag): [Item!]!
        count(tag: Tag): Int
      }
      union Result = Item
    `);

    expect(Schema.getTypeUsages(schema, 'Tag')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [
        { kind: 'query', name: 'count' },
        { kind: 'query', name: 'search' },
      ],
      argumentOf: [{ parent: 'Item', field: 'tags' }],
    });
    const item = schema.getType('Item') as GraphQLObjectType;
    expect(Schema.getUnions(schema, item)).toEqual([schema.getType('Result')]);
  });
});
