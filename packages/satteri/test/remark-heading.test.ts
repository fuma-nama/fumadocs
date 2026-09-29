import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkHeading } from '@/remark-heading';
import type { TOCItemType } from 'fumadocs-core/toc';

async function compile(source: string) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    mdastPlugins: [remarkHeading({ generateToc: true })],
  })('bundler');

  return compileMdx({ source, filePath: '/test.mdx', options });
}

describe('remark-heading', () => {
  it('slugs headings and collects toc', async () => {
    const { data } = await compile('## Hello World\n\n### Deep Dive');

    expect(data?.toc).toEqual([
      { title: 'Hello World', url: '#hello-world', depth: 2 },
      { title: 'Deep Dive', url: '#deep-dive', depth: 3 },
    ] satisfies TOCItemType[]);
  });

  it('deduplicates repeated slugs', async () => {
    const { data } = await compile('## Setup\n\n## Setup');

    expect((data!.toc as TOCItemType[]).map((item) => item.url)).toEqual(['#setup', '#setup-1']);
  });

  it('strips custom id markers from toc titles', async () => {
    const { data, code } = await compile('## Hello World [#custom-id]');

    expect(data?.toc).toEqual([{ title: 'Hello World', url: '#custom-id', depth: 2 }]);
    // rendered heading must not contain the marker either
    expect(code).not.toContain('[#custom-id]');
  });

  it('respects customId: false', async () => {
    const options = await applySatteriPreset({
      preset: 'minimal',
      mdastPlugins: [remarkHeading({ generateToc: true, customId: false })],
    })('bundler');
    const { data } = await compileMdx({
      source: '## Hello [#nope]',
      filePath: '/test.mdx',
      options,
    });

    expect((data!.toc as TOCItemType[])[0]!.url).not.toBe('#nope');
  });
});
