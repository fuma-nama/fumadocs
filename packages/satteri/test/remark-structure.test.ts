import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import type { StructuredData } from '@/remark-structure';

async function compile(source: string) {
  const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
  const result = await compileMdx({ source, filePath: '/test.mdx', options });
  return result.data?.structuredData as StructuredData;
}

describe('remark-structure', () => {
  it('collects headings and contents', async () => {
    const data = await compile('## Overview\n\nfirst paragraph\n\nsecond paragraph');

    expect(data.headings).toEqual([{ id: 'overview', content: 'Overview' }]);
    expect(data.contents).toEqual([
      { heading: 'overview', content: 'first paragraph' },
      { heading: 'overview', content: 'second paragraph' },
    ]);
  });

  it('assigns content before any heading to no heading', async () => {
    const data = await compile('intro text\n\n## Section\n\nbody');

    expect(data.contents[0]).toEqual({ heading: undefined, content: 'intro text' });
    expect(data.contents[1]).toEqual({ heading: 'section', content: 'body' });
  });

  it('exports empty structured data for documents without matches', async () => {
    const data = await compile('```js\nconst x = 1\n```');

    expect(data).toEqual({ contents: [], headings: [] });
  });
});
