import { afterAll, describe, expect, test } from 'vitest';
import { createMDX } from '@/next';

const previousFlag = process.env._FUMADOCS_MDX;
process.env._FUMADOCS_MDX = '1';

afterAll(() => {
  if (previousFlag === undefined) delete process.env._FUMADOCS_MDX;
  else process.env._FUMADOCS_MDX = previousFlag;
});

describe('Next.js config', () => {
  test('emits queried JSON meta files as JavaScript in Turbopack', () => {
    const config = createMDX({ macro: { include: ['**/source.ts'] } })();
    const rule = config.turbopack?.rules?.['*.json'] as {
      as?: string;
      loaders: { options?: Record<string, unknown> }[];
    };

    expect(rule.as).toBe('*.js');
    // the meta loader derives its JSON output format from `type`
    expect(rule.loaders[0]?.options).toMatchObject({ type: 'turbopack' });
  });

  test('never runs the macro on node_modules in Turbopack, like in webpack', () => {
    const config = createMDX({ macro: { include: ['**/source.ts'] } })();
    const rule = config.turbopack?.rules?.['**/source.ts'] as { condition?: unknown };

    // `foreign` is Turbopack's condition for code in node_modules
    expect(rule.condition).toMatchObject({ all: expect.arrayContaining([{ not: 'foreign' }]) });
  });
});
