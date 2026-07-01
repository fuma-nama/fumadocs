import { describe, expect, it } from 'vitest';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { compileMdx, applySatteriPreset } from '@fumadocs/satteri';

describe('rehype-code', () => {
  it('highlights fenced code blocks', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: {
        ...rehypeCodeDefaultOptions,
        lazy: false,
        langs: ['js'],
      },
    })('bundler');

    const { code } = await compileMdx({
      source: '```js\nconst x = 1\n```',
      filePath: '/tmp/test.mdx',
      options,
    });

    expect(code).toContain('shiki');
    expect(code).toContain('const');
  });
});
