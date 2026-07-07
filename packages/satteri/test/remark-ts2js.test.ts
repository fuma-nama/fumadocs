import { expect, test } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkTs2js } from '@/remark-ts2js';

test('remark-ts2js transforms ts blocks with ts2js meta', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkTs2js()],
  })('bundler');

  const result = await compileMdx({
    source: '```ts ts2js\nconst answer: number = 1\n```',
    filePath: '/example.ts',
    options,
  });

  expect(result.code).toContain('CodeBlockTabs');
  expect(result.code).toContain('const answer: number = 1');
  expect(result.code).toContain('const answer = 1');
});

test('remark-ts2js ignores blocks without ts2js meta', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkTs2js()],
  })('bundler');

  const result = await compileMdx({
    source: '```ts\nconst answer: number = 1\n```',
    filePath: '/example.ts',
    options,
  });

  expect(result.code).not.toContain('CodeBlockTabs');
});
