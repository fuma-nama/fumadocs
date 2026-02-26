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
