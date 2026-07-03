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
    expect(data?.structuredData).toBeDefined();
  });

  it('does not leak mutable compile data between files', async () => {
    const options = await applySatteriPreset({
      data: {},
      rehypeCodeOptions: false,
    })('bundler');

    await compileMdx({
      source: '# First',
      filePath: '/tmp/first.mdx',
      frontmatter: { title: 'First' },
      options,
    });

    const { code } = await compileMdx({
      source: '# Second',
      filePath: '/tmp/second.mdx',
      frontmatter: { title: 'Second' },
      options,
    });

    expect(code.match(/export const frontmatter/g)).toHaveLength(1);
    expect(code).toContain('"Second"');
    expect(code).not.toContain('"First"');
  });

  it('updates named exports instead of duplicating them', async () => {
    const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
    const { code } = await compileMdx({
      source: '# One\n\n## Two',
      filePath: '/tmp/toc.mdx',
      options,
    });

    expect(code.match(/export const toc/g)).toHaveLength(1);
    expect(code).toContain('#one');
    expect(code).toContain('#two');
  });
});
