import { expect, test } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkLlms } from '@/remark-llms';

const paragraph = '# Title\n\n' + 'Lorem ipsum dolor sit amet.\n\n'.repeat(200);

test('remark-llms exports processed markdown once', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: paragraph,
    filePath: '/doc.mdx',
    options,
  });

  expect(typeof result.data?.markdown).toBe('string');
  expect(result.data?.markdown).toContain('Title');
});

test('remark-llms handles many root blocks', async () => {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkLlms()],
  })('bundler');

  const result = await compileMdx({
    source: '# A\n\n' + Array.from({ length: 100 }, (_, i) => `Paragraph ${i}.`).join('\n\n'),
    filePath: '/large.mdx',
    options,
  });

  const markdown = result.data?.markdown as string;
  expect(markdown).toContain('Paragraph 0.');
  expect(markdown).toContain('Paragraph 99.');
});
