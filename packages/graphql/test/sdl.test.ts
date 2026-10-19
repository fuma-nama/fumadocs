import { describe, expect, test } from 'vitest';
import { buildSchema, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { printDefinition } from '@/utils/sdl';

const sdl = `
"""Requires specific access scopes."""
directive @auth(requires: String = "admin") on OBJECT

"""A customer's order."""
type Order @auth(requires: "user") {
  """The ID."""
  id: ID!
}

extend type Order {
  note: String
}

type Query {
  order: Order
}
`;

describe('printDefinition', () => {
  test('prints definitions as written, with custom directives and extensions', () => {
    const schema = buildSchemaFromSDL(sdl);

    expect(printDefinition(schema.getType('Order')!)).toMatchInlineSnapshot(`
      "type Order @auth(requires: "user") {
        id: ID!
      }

      extend type Order {
        note: String
      }"
    `);
    expect(printDefinition(schema.getDirective('auth')!, { descriptions: true }))
      .toMatchInlineSnapshot(`
        """"Requires specific access scopes."""
        directive @auth(requires: String = "admin") on OBJECT"
      `);
  });

  test('prints programmatic schemas without AST', () => {
    const query = new GraphQLObjectType({
      name: 'Query',
      description: 'The root.',
      fields: { name: { type: GraphQLString, description: 'A name.' } },
    });
    const schema = new GraphQLSchema({ query });

    expect(printDefinition(schema.getQueryType()!)).toBe('type Query {\n  name: String\n}');
    expect(printDefinition(buildSchema('type Query { a: Int }').getQueryType()!)).toBe(
      'type Query {\n  a: Int\n}',
    );
  });
});
