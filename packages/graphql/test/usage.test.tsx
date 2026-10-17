import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import type { GraphQLObjectType } from 'graphql';
import { describe, expect, test } from 'vitest';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { GraphQLProvider } from '@/utils/create-page';
import { TypeDocs } from '@/ui/type-docs';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { getTypeUsages, getUnions } from '@/utils/schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const sdl = fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8');

/** the text of the usages card on the page of a named type */
function renderUsages(name: string, schema = sdl): { html: string; text: string } {
  const html = renderToString(
    <GraphQLProvider
      sdl={schema}
      shiki={defaultShikiFactory}
      components={{
        SchemaUI: () => null,
        Markdown: () => null,
        CodeBlock: () => null,
        Heading: () => null,
      }}
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
  test('usages card', () => {
    const order = renderUsages('Order');
    // operations by kind and name, fields by parent and name
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
    // output and input fields
    expect(renderUsages('OrderStatus').text).toBe(
      'Field ofOrder.statusOrderFilter.statusArgument ofCustomer.orders',
    );
    // `Role` is only referenced from directive arguments
    expect(renderUsages('Role').text).toBe('');
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

    expect(getTypeUsages(schema, 'Tag')).toEqual({
      returnedBy: [],
      memberOf: [],
      inputFor: [
        { kind: 'query', name: 'count' },
        { kind: 'query', name: 'search' },
      ],
      argumentOf: [{ parent: 'Item', field: 'tags' }],
    });
    const item = schema.getType('Item') as GraphQLObjectType;
    expect(getUnions(schema, item)).toEqual([schema.getType('Result')]);
  });
});
