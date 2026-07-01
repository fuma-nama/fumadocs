import { describe, expect, it } from 'vitest';
import { applySatteriPreset, compileMdx } from '@fumadocs/satteri';

describe('@fumadocs/satteri', () => {
  it('compiles mdx with fumadocs preset', async () => {
    const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
    const { code, data } = await compileMdx({
      source: '# Hello\n\nWorld',
      filePath: '/tmp/test.mdx',
      frontmatter: { title: 'Test' },
      options,
    });

    expect(code).toContain('export default');
    expect(code).toContain('export const frontmatter');
    expect(data.structuredData).toBeDefined();
  });
});
