import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse, validate } from 'graphql';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { readSelection, toggleField } from '@/playground/selection';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

const customer = { kind: 'query', name: 'customer' } as const;
const search = { kind: 'query', name: 'search' } as const;

/** toggle, and check the result against the schema */
function toggle(...args: Parameters<typeof toggleField>): string {
  const result = toggleField(...args);
  expect(validate(args[0], parse(result))).toEqual([]);
  return result;
}

describe('readSelection', () => {
  const document = parse(`
    query Customer($id: ID!) {
      customer(id: $id) {
        id
        fullName: name
        ...CustomerFields
        contact {
          email
        }
        recent: orders {
          customer {
            name
          }
        }
      }
    }

    fragment CustomerFields on Customer {
      email
      contact {
        phone
      }
      ...CustomerOrders
    }

    fragment CustomerOrders on Customer {
      email
      orders {
        id
      }
      ...CustomerFields
    }
  `);

  test('nested paths, aliases count as their field', () => {
    expect(readSelection(document, customer, [])).toMatchObject({
      fields: new Set(['id', 'name', 'contact', 'orders']),
      fragments: new Set(),
    });
    expect(
      readSelection(document, customer, [{ field: 'orders' }, { field: 'customer' }])?.fields,
    ).toEqual(new Set(['name']));
  });

  test('fields of fragment spreads, nested and cyclic ones included', () => {
    const level = readSelection(document, customer, []);
    expect(level?.fields.has('email')).toBe(false);
    expect(level?.spread).toEqual(
      new Map([
        ['email', 'CustomerFields'],
        ['contact', 'CustomerFields'],
        ['orders', 'CustomerFields'],
      ]),
    );
    // the spread isn't followed into nested levels
    expect(readSelection(document, customer, [{ field: 'contact' }])).toEqual({
      fields: new Set(['email']),
      fragments: new Set(),
      spread: new Map(),
    });
  });

  test('inline fragments', () => {
    const document = parse(`
      query Search {
        search(term: "a") {
          __typename
          ... on Customer {
            id
            contact {
              phone
            }
          }
          ... on Order {
            id
          }
        }
      }
    `);

    expect(readSelection(document, search, [])).toEqual({
      fields: new Set(['__typename']),
      fragments: new Set(['Customer', 'Order']),
      spread: new Map(),
    });
    expect(
      readSelection(document, search, [{ on: 'Customer' }, { field: 'contact' }])?.fields,
    ).toEqual(new Set(['phone']));
  });

  test('not selected', () => {
    expect(readSelection(document, customer, [{ field: 'orders' }, { field: 'id' }])).toBe(
      undefined,
    );
    expect(readSelection(document, customer, [{ on: 'Customer' }])).toBe(undefined);
    expect(readSelection(document, { kind: 'mutation', name: 'customer' }, [])).toBe(undefined);
    expect(readSelection(document, { kind: 'query', name: 'orders' }, [])).toBe(undefined);
  });
});

describe('toggleField', () => {
  const query = 'query Customer($id: ID!) { customer(id: $id) { id } }';
  const searchQuery = 'query Search { search(term: "a") { __typename } }';

  test('select a leaf field', () => {
    expect(toggle(schema, query, customer, [], 'name', true)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          id
          name
        }
      }"
    `);
  });

  test('select a composite field with a default sub-selection', () => {
    // `Order` has an `id` field
    expect(toggle(schema, query, customer, [], 'orders', true)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          id
          orders {
            id
          }
        }
      }"
    `);
    // `ContactInfo` doesn't, its leaf fields are selected instead
    expect(toggle(schema, query, customer, [], 'contact', true)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          id
          contact {
            email
            phone
          }
        }
      }"
    `);
  });

  test('select inside missing parents', () => {
    expect(
      toggle(
        schema,
        query,
        customer,
        [{ field: 'orders' }, { field: 'customer' }],
        'contact',
        true,
      ),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          id
          orders {
            customer {
              contact {
                email
                phone
              }
            }
          }
        }
      }"
    `);
  });

  test('select inside a missing inline fragment', () => {
    expect(toggle(schema, searchQuery, search, [{ on: 'Customer' }], 'name', true))
      .toMatchInlineSnapshot(`
      "query Search {
        search(term: "a") {
          __typename
          ... on Customer {
            name
          }
        }
      }"
    `);
  });

  test('`__typename` of abstract types', () => {
    const query = 'query Search { search(term: "a") { ... on Customer { id } } }';

    const selected = toggle(schema, query, search, [], '__typename', true);
    expect(selected).toMatchInlineSnapshot(`
      "query Search {
        search(term: "a") {
          ... on Customer {
            id
          }
          __typename
        }
      }"
    `);
    expect(toggle(schema, selected, search, [], '__typename', false)).toMatchInlineSnapshot(`
      "query Search {
        search(term: "a") {
          ... on Customer {
            id
          }
        }
      }"
    `);
  });

  test('default sub-selections of other types', () => {
    const schema = buildSchemaFromSDL(`
      type Query { post: Post }
      type Post { author: Author, attachments: [Attachment!]!, related: Related }
      type Author { name: String!, handle: String @deprecated, avatar(size: Int!): String }
      union Attachment = Image | Video
      type Image { url: String }
      type Video { url: String }
      type Related { posts: [Post!]! }
    `);
    const post = { kind: 'query', name: 'post' } as const;
    const query = '{ post { __typename } }';

    // deprecated fields and fields with required arguments are left out
    expect(toggle(schema, query, post, [], 'author', true)).toMatchInlineSnapshot(`
      "{
        post {
          author {
            name
          }
        }
      }"
    `);
    // unions and objects without leaf fields
    expect(toggle(schema, query, post, [], 'attachments', true)).toMatchInlineSnapshot(`
      "{
        post {
          attachments {
            __typename
          }
        }
      }"
    `);
    expect(toggle(schema, query, post, [], 'related', true)).toMatchInlineSnapshot(`
      "{
        post {
          related {
            __typename
          }
        }
      }"
    `);
  });

  test('select into a field without a selection set', () => {
    expect(
      toggle(schema, 'query Customer($id: ID!) { customer(id: $id) }', customer, [], 'name', true),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          name
        }
      }"
    `);
  });

  test('fragment spreads are kept', () => {
    const query = `
      query Customer($id: ID!) {
        customer(id: $id) {
          ...CustomerFields
          id
        }
      }

      fragment CustomerFields on Customer {
        name
      }
    `;

    // not read as selected, the field is added explicitly
    expect(toggle(schema, query, customer, [], 'name', true)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          ...CustomerFields
          id
          name
        }
      }

      fragment CustomerFields on Customer {
        name
      }"
    `);
    // a level with a spread left isn't empty
    expect(toggle(schema, query, customer, [], 'id', false)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          ...CustomerFields
        }
      }

      fragment CustomerFields on Customer {
        name
      }"
    `);
  });

  test('deselect every selection of the field', () => {
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { id name fullName: name } }',
        customer,
        [],
        'name',
        false,
      ),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          id
        }
      }"
    `);
  });

  test('deselect the last field of a nested object', () => {
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { id contact { email } } }',
        customer,
        [{ field: 'contact' }],
        'email',
        false,
      ),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          id
        }
      }"
    `);
  });

  test('deselect the last field of an inline fragment', () => {
    expect(
      toggle(
        schema,
        'query Search { search(term: "a") { __typename ... on Customer { name } } }',
        search,
        [{ on: 'Customer' }],
        'name',
        false,
      ),
    ).toMatchInlineSnapshot(`
      "query Search {
        search(term: "a") {
          __typename
        }
      }"
    `);
  });

  test('deselect the last field of the root', () => {
    expect(toggle(schema, query, customer, [], 'id', false)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          __typename
        }
      }"
    `);
    // emptied levels are removed up to the root
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { orders { customer { name } } } }',
        customer,
        [{ field: 'orders' }, { field: 'customer' }],
        'name',
        false,
      ),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          __typename
        }
      }"
    `);
  });

  test('a new field replaces the `__typename` placeholder', () => {
    // uncheck everything under the root
    let query = toggle(
      schema,
      'query Customer($id: ID!) { customer(id: $id) { id contact { email } } }',
      customer,
      [],
      'id',
      false,
    );
    query = toggle(schema, query, customer, [{ field: 'contact' }], 'email', false);

    expect(toggle(schema, query, customer, [], 'name', true)).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          name
        }
      }"
    `);
    // also by a created parent
    expect(toggle(schema, query, customer, [{ field: 'contact' }], 'phone', true))
      .toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          contact {
            phone
          }
        }
      }"
    `);
  });

  test('a `__typename` with an alias or directives is kept', () => {
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { type: __typename } }',
        customer,
        [],
        'name',
        true,
      ),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          type: __typename
          name
        }
      }"
    `);
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { __typename @include(if: true) } }',
        customer,
        [],
        'name',
        true,
      ),
    ).toMatchInlineSnapshot(`
      "query Customer($id: ID!) {
        customer(id: $id) {
          __typename @include(if: true)
          name
        }
      }"
    `);
  });

  test('variables, arguments, directives and aliases are untouched', () => {
    const query = `
      query Customer($id: ID!, $withContact: Boolean!) {
        customer(id: $id) {
          id
          primary: contact @include(if: $withContact) {
            email
          }
          orders(status: SHIPPED, first: 5) @skip(if: false) {
            id
          }
        }
      }
    `;

    expect(toggle(schema, query, customer, [{ field: 'contact' }], 'phone', true))
      .toMatchInlineSnapshot(`
        "query Customer($id: ID!, $withContact: Boolean!) {
          customer(id: $id) {
            id
            primary: contact @include(if: $withContact) {
              email
              phone
            }
            orders(status: SHIPPED, first: 5) @skip(if: false) {
              id
            }
          }
        }"
      `);
    expect(toggle(schema, query, customer, [{ field: 'orders' }], 'total', true))
      .toMatchInlineSnapshot(`
        "query Customer($id: ID!, $withContact: Boolean!) {
          customer(id: $id) {
            id
            primary: contact @include(if: $withContact) {
              email
            }
            orders(status: SHIPPED, first: 5) @skip(if: false) {
              id
              total
            }
          }
        }"
      `);
  });

  test('only the first operation selecting the root field', () => {
    const query = `
      query Orders { orders { id } }
      query First($id: ID!) { customer(id: $id) { id } }
      query Second { customer(id: "2") { id } }
    `;

    expect(toggle(schema, query, customer, [], 'name', true)).toMatchInlineSnapshot(`
      "query Orders {
        orders {
          id
        }
      }

      query First($id: ID!) {
        customer(id: $id) {
          id
          name
        }
      }

      query Second {
        customer(id: "2") {
          id
        }
      }"
    `);
  });

  test('unchanged', () => {
    const unparsable = 'query Customer($id: ID!) { customer(id: $id) {';
    expect(toggleField(schema, unparsable, customer, [], 'name', true)).toBe(unparsable);

    const orders = 'query Orders { orders { id } }';
    expect(toggleField(schema, orders, customer, [], 'name', true)).toBe(orders);

    const aliased = 'query Customer($id: ID!) { customer(id: $id) { fullName: name } }';
    expect(toggleField(schema, aliased, customer, [], 'name', true)).toBe(aliased);
    expect(toggleField(schema, query, customer, [{ field: 'contact' }], 'email', false)).toBe(
      query,
    );

    // missing from the schema
    expect(toggleField(schema, query, customer, [], 'unknown', true)).toBe(query);
    expect(toggleField(schema, query, customer, [{ field: 'name' }], 'id', true)).toBe(query);
    expect(toggleField(schema, query, customer, [{ on: 'Unknown' }], 'id', true)).toBe(query);
    expect(toggleField(schema, searchQuery, search, [], 'id', true)).toBe(searchQuery);
  });
});
