import { describe, expect, test } from 'vitest';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { unwrapMagic } from '@/playground/auth';

describe('unwrapMagic', () => {
  test('turns a free-form request body into cloneable plain data', () => {
    const body = createMagicProxy({
      event_id: 9001,
      title: 'Fix login flow',
      open: true,
      labels: ['bug', 'urgent'],
    });

    const result = unwrapMagic({ header: {}, body });

    expect(result).toEqual({
      header: {},
      body: {
        event_id: 9001,
        title: 'Fix login flow',
        open: true,
        labels: ['bug', 'urgent'],
      },
    });
    expect(structuredClone(result)).toEqual(result);
  });

  test('keeps binary values intact', () => {
    const file = new Blob(['payload']);

    const result = unwrapMagic({ body: { file } });

    expect(result.body.file).toBe(file);
  });

  test('keeps __proto__ as an own enumerable property', () => {
    const body = createMagicProxy(JSON.parse('{"__proto__":{"x":1},"keep":2}'));

    const result = unwrapMagic({ body });

    expect(Object.prototype.hasOwnProperty.call(result.body, '__proto__')).toBe(true);
    expect(Object.keys(result.body)).toEqual(['__proto__', 'keep']);
    expect(result.body).toEqual(JSON.parse('{"__proto__":{"x":1},"keep":2}'));
  });
});
