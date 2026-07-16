import { expect, test } from 'vitest';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { matchesSchema, typeMatches } from '@/schema/match';
import type { ParsedSchema } from '@/schema';

test('typeMatches: primitives and integer/number', () => {
  expect(typeMatches('hi', 'string')).toBe(true);
  expect(typeMatches(null, 'null')).toBe(true);
  expect(typeMatches(3, 'integer')).toBe(true);
  expect(typeMatches(3, 'number')).toBe(true);
  expect(typeMatches(3.5, 'integer')).toBe(false);
  expect(typeMatches([], 'array')).toBe(true);
  expect(typeMatches({}, 'object')).toBe(true);
});

test('tagged union discriminated by nested const', () => {
  const members: ParsedSchema[] = [
    { type: 'object', properties: { type: { const: 'cat' }, meow: { type: 'string' } } },
    { type: 'object', properties: { type: { const: 'dog' }, bark: { type: 'string' } } },
  ];

  expect(members.findIndex((m) => matchesSchema(m, { type: 'dog', bark: 'woof' }))).toBe(1);
  expect(members.findIndex((m) => matchesSchema(m, { type: 'cat', meow: 'mew' }))).toBe(0);
});

test('tagged union discriminated by nested enum', () => {
  const members: ParsedSchema[] = [
    { properties: { kind: { enum: ['a', 'b'] } } },
    { properties: { kind: { enum: ['c'] } } },
  ];

  expect(members.findIndex((m) => matchesSchema(m, { kind: 'c' }))).toBe(1);
  expect(members.findIndex((m) => matchesSchema(m, { kind: 'b' }))).toBe(0);
});

test('union members behind $ref are resolved before matching', () => {
  const doc = createMagicProxy({
    components: {
      schemas: {
        Cat: {
          type: 'object',
          required: ['type'],
          properties: { type: { const: 'cat' }, meow: { type: 'string' } },
        },
        Dog: {
          type: 'object',
          required: ['type'],
          properties: { type: { const: 'dog' }, bark: { type: 'string' } },
        },
      },
    },
    field: {
      oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
    },
  }) as never as {
    field: { oneOf: unknown[] };
  };
  const members = doc.field.oneOf;

  expect(members.findIndex((m) => matchesSchema(m as never, { type: 'dog', bark: 'woof' }))).toBe(
    1,
  );
  expect(members.findIndex((m) => matchesSchema(m as never, { type: 'cat', meow: 'mew' }))).toBe(0);
});

test('falls through (matches) when nothing discriminates', () => {
  // two structurally identical members → first one wins, never -1
  const members: ParsedSchema[] = [{ type: 'object' }, { type: 'object' }];
  expect(members.findIndex((m) => matchesSchema(m, { any: 1 }))).toBe(0);
});

test('type mismatch rejects a member', () => {
  const members: ParsedSchema[] = [{ type: 'string' }, { type: 'number' }];
  expect(members.findIndex((m) => matchesSchema(m, 42))).toBe(1);
});

test('allOf: value must satisfy every subschema', () => {
  const schema: ParsedSchema = {
    allOf: [
      { type: 'object', required: ['a'] },
      { type: 'object', required: ['b'] },
    ],
  };
  expect(matchesSchema(schema, { a: 1, b: 2 })).toBe(true);
  expect(matchesSchema(schema, { a: 1 })).toBe(false);
});

test('anyOf / oneOf: value must satisfy at least one subschema', () => {
  const members: ParsedSchema[] = [
    { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
    { oneOf: [{ type: 'number' }, { type: 'array' }] },
  ];
  expect(members.findIndex((m) => matchesSchema(m, 'hi'))).toBe(0);
  expect(members.findIndex((m) => matchesSchema(m, 42))).toBe(1);
  expect(members.findIndex((m) => matchesSchema(m, [1, 2]))).toBe(1);
});

test('not: value must not match the subschema', () => {
  const schema: ParsedSchema = { not: { type: 'string' } };
  expect(matchesSchema(schema, 42)).toBe(true);
  expect(matchesSchema(schema, 'hi')).toBe(false);
});

test('items: every array element must match', () => {
  const schema: ParsedSchema = { type: 'array', items: { type: 'number' } };
  expect(matchesSchema(schema, [1, 2, 3])).toBe(true);
  expect(matchesSchema(schema, [1, 'x'])).toBe(false);
});

test('composition discriminates union members (allOf-composed tagged union)', () => {
  const members: ParsedSchema[] = [
    { allOf: [{ properties: { kind: { const: 'a' } } }, { required: ['a'] }] },
    { allOf: [{ properties: { kind: { const: 'b' } } }, { required: ['b'] }] },
  ];
  expect(members.findIndex((m) => matchesSchema(m, { kind: 'b', b: 1 }))).toBe(1);
  expect(members.findIndex((m) => matchesSchema(m, { kind: 'a', a: 1 }))).toBe(0);
});

test('self-referential composition does not hang', () => {
  const doc = createMagicProxy({
    node: {
      // a schema that references itself through `allOf` — must not recurse forever
      allOf: [{ $ref: '#/node' }, { type: 'object' }],
    },
  }) as never as { node: unknown };

  expect(matchesSchema(doc.node as never, { any: 1 })).toBe(true);
});
