import { DataEngine } from '@/index';
import { expect, test } from 'vitest';

test('data engine: basic', () => {
  const logs: string[] = [];
  const engine = new DataEngine({});
  engine.listen({
    onDelete(key) {
      logs.push(`delete ${key}`);
    },
    onInit(key) {
      logs.push(`init ${key}`);
    },
    onUpdate(key, ctx) {
      logs.push(`update ${key} ${ctx.swallow}`);
    },
  });
  expect(engine.init(['hello', 'world', 2], 'test')).toBe('test');
  expect(engine.init(['hello', 'world', 1, 'property'], 'test')).toBe('test');
  expect(engine.getData()).toMatchInlineSnapshot(`
    {
      "hello": {
        "world": [
          ,
          {
            "property": "test",
          },
          "test",
        ],
      },
    }
  `);

  expect(engine.delete(['hello', 'world', 1])).toMatchInlineSnapshot(`
    {
      "property": "test",
    }
  `);
  expect(engine.getData()).toMatchInlineSnapshot(`
    {
      "hello": {
        "world": [
          ,
          "test",
        ],
      },
    }
  `);
  expect(logs).toMatchInlineSnapshot(`
    [
      "init hello",
      "init hello,world",
      "init hello,world,2",
      "update  true",
      "init hello,world,1",
      "init hello,world,1,property",
      "update hello,world true",
      "delete hello,world,1",
      "update hello,world false",
    ]
  `);
});

test('data engine: `__proto__` is an own field', () => {
  const engine = new DataEngine({});
  engine.init(['body', '__proto__'], 'value');
  engine.init(['body', 'nested', '__proto__', 'x'], 1);
  const data = engine.getData() as Record<string, Record<string, unknown>>;

  expect(Object.hasOwn(data.body, '__proto__')).toBe(true);
  expect(JSON.stringify(data)).toBe(
    '{"body":{"__proto__":"value","nested":{"__proto__":{"x":1}}}}',
  );
  expect(engine.get(['other', '__proto__'])).toBeUndefined();
  expect(engine.update(['body', '__proto__'], 'next')).toBe(true);
  expect(engine.get(['body', '__proto__'])).toBe('next');
  expect(engine.delete(['body', '__proto__'])).toBe('next');
  expect(Object.hasOwn(data.body, '__proto__')).toBe(false);
  expect(Object.keys(Object.prototype)).toEqual([]);
});
