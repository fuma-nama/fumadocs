import { expect, test } from 'vitest';
import { sample } from '@/sample';

test('sample properties named `__proto__` & `constructor`', () => {
  const schema = JSON.parse(
    '{"type":"object","properties":{"__proto__":{"type":"string"},"constructor":{"type":"number"}}}',
  );

  expect(JSON.stringify(sample(schema))).toBe('{"__proto__":"string","constructor":0}');
  expect(
    JSON.stringify(
      sample({ allOf: [schema, { type: 'object', properties: { name: { type: 'string' } } }] }),
    ),
  ).toBe('{"__proto__":"string","constructor":0,"name":"string"}');
});
