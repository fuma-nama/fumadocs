import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse, print, validate } from 'graphql';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { readSelection, toggleField } from '@/playground/selection';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);

const customer = { kind: 'query', name: 'customer' } as const;
const search = { kind: 'query', name: 'search' } as const;

/** the document printed like `toggleField()` prints it */
const doc = (query: string) => print(parse(query));

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

  test('the fields and inline fragments at a path, aliases count as their field', () => {
    expect(readSelection(document, customer, [])).toMatchObject({
      fields: new Set(['id', 'name', 'contact', 'orders']),
      fragments: new Set(),
    });
    expect(
      readSelection(document, customer, [{ field: 'orders' }, { field: 'customer' }])?.fields,
    ).toEqual(new Set(['name']));

    const searched = parse(`
      query Search {
        search(term: "a") {
          __typename
          ... on Customer { id contact { phone } }
          ... on Order { id }
        }
      }
    `);
    expect(readSelection(searched, search, [])).toEqual({
      fields: new Set(['__typename']),
      fragments: new Set(['Customer', 'Order']),
      spread: new Map(),
    });
    expect(
      readSelection(searched, search, [{ on: 'Customer' }, { field: 'contact' }])?.fields,
    ).toEqual(new Set(['phone']));
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

  test('select, creating missing parents and inline fragments', () => {
    expect(toggle(schema, query, customer, [], 'name', true)).toBe(
      doc('query Customer($id: ID!) { customer(id: $id) { id name } }'),
    );
    expect(
      toggle(
        schema,
        query,
        customer,
        [{ field: 'orders' }, { field: 'customer' }],
        'contact',
        true,
      ),
    ).toBe(
      doc(
        'query Customer($id: ID!) { customer(id: $id) { id orders { customer { contact { email phone } } } } }',
      ),
    );
    expect(toggle(schema, searchQuery, search, [{ on: 'Customer' }], 'name', true)).toBe(
      doc('query Search { search(term: "a") { __typename ... on Customer { name } } }'),
    );
    // a field without a selection set
    expect(
      toggle(schema, 'query Customer($id: ID!) { customer(id: $id) }', customer, [], 'name', true),
    ).toBe(doc('query Customer($id: ID!) { customer(id: $id) { name } }'));
  });

  test('default sub-selections', () => {
    // `Order` has an `id` field, `ContactInfo` doesn't: its leaf fields are selected instead
    expect(toggle(schema, query, customer, [], 'orders', true)).toBe(
      doc('query Customer($id: ID!) { customer(id: $id) { id orders { id } } }'),
    );
    expect(toggle(schema, query, customer, [], 'contact', true)).toBe(
      doc('query Customer($id: ID!) { customer(id: $id) { id contact { email phone } } }'),
    );

    const other = buildSchemaFromSDL(`
      type Query { post: Post }
      type Post { author: Author, attachments: [Attachment!]!, related: Related }
      type Author { name: String!, handle: String @deprecated, avatar(size: Int!): String }
      union Attachment = Image | Video
      type Image { url: String }
      type Video { url: String }
      type Related { posts: [Post!]! }
    `);
    const post = { kind: 'query', name: 'post' } as const;
    const postQuery = '{ post { __typename } }';
    // deprecated fields and fields with required arguments are left out
    expect(toggle(other, postQuery, post, [], 'author', true)).toBe(
      doc('{ post { author { name } } }'),
    );
    // unions and objects without leaf fields
    expect(toggle(other, postQuery, post, [], 'attachments', true)).toBe(
      doc('{ post { attachments { __typename } } }'),
    );
    expect(toggle(other, postQuery, post, [], 'related', true)).toBe(
      doc('{ post { related { __typename } } }'),
    );
  });

  test('`__typename` of abstract types', () => {
    const query = 'query Search { search(term: "a") { ... on Customer { id } } }';
    const selected = toggle(schema, query, search, [], '__typename', true);

    expect(selected).toBe(
      doc('query Search { search(term: "a") { ... on Customer { id } __typename } }'),
    );
    expect(toggle(schema, selected, search, [], '__typename', false)).toBe(doc(query));
  });

  test('fragment spreads are kept', () => {
    const query = `
      query Customer($id: ID!) { customer(id: $id) { ...CustomerFields id } }
      fragment CustomerFields on Customer { name }
    `;

    // not read as selected, the field is added explicitly
    expect(toggle(schema, query, customer, [], 'name', true)).toBe(
      doc(query.replace('id }', 'id name }')),
    );
    // a level with a spread left isn't empty
    expect(toggle(schema, query, customer, [], 'id', false)).toBe(
      doc(query.replace(' id }', ' }')),
    );
  });

  test('deselect every selection of the field, emptied levels are removed', () => {
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { id name fullName: name } }',
        customer,
        [],
        'name',
        false,
      ),
    ).toBe(doc(query));
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { id contact { email } } }',
        customer,
        [{ field: 'contact' }],
        'email',
        false,
      ),
    ).toBe(doc(query));
    expect(
      toggle(
        schema,
        'query Search { search(term: "a") { __typename ... on Customer { name } } }',
        search,
        [{ on: 'Customer' }],
        'name',
        false,
      ),
    ).toBe(doc(searchQuery));

    // up to the root field, it keeps `__typename`
    const emptied = doc('query Customer($id: ID!) { customer(id: $id) { __typename } }');
    expect(toggle(schema, query, customer, [], 'id', false)).toBe(emptied);
    expect(
      toggle(
        schema,
        'query Customer($id: ID!) { customer(id: $id) { orders { customer { name } } } }',
        customer,
        [{ field: 'orders' }, { field: 'customer' }],
        'name',
        false,
      ),
    ).toBe(emptied);
  });

  test('the `__typename` placeholder', () => {
    const placeholder = 'query Customer($id: ID!) { customer(id: $id) { __typename } }';

    // replaced by a new field, also by a created parent
    expect(toggle(schema, placeholder, customer, [], 'name', true)).toBe(
      doc('query Customer($id: ID!) { customer(id: $id) { name } }'),
    );
    expect(toggle(schema, placeholder, customer, [{ field: 'contact' }], 'phone', true)).toBe(
      doc('query Customer($id: ID!) { customer(id: $id) { contact { phone } } }'),
    );
    // kept with an alias or directives
    for (const kept of ['type: __typename', '__typename @include(if: true)']) {
      expect(
        toggle(schema, placeholder.replace('__typename', kept), customer, [], 'name', true),
      ).toBe(doc(placeholder.replace('__typename', `${kept} name`)));
    }
  });

  test('variables, arguments, directives and aliases are untouched', () => {
    const query = `
      query Customer($id: ID!, $withContact: Boolean!) {
        customer(id: $id) {
          id
          primary: contact @include(if: $withContact) { email }
          orders(status: SHIPPED, first: 5) @skip(if: false) { id }
        }
      }
    `;

    expect(toggle(schema, query, customer, [{ field: 'contact' }], 'phone', true)).toBe(
      doc(query.replace('{ email }', '{ email phone }')),
    );
    expect(toggle(schema, query, customer, [{ field: 'orders' }], 'total', true)).toBe(
      doc(query.replace('{ id }', '{ id total }')),
    );
  });

  test('only the first operation selecting the root field', () => {
    const query = `
      query Orders { orders { id } }
      query First($id: ID!) { customer(id: $id) { id } }
      query Second { customer(id: "2") { id } }
    `;

    expect(toggle(schema, query, customer, [], 'name', true)).toBe(
      doc(query.replace('customer(id: $id) { id }', 'customer(id: $id) { id name }')),
    );
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
