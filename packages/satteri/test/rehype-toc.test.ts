import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';

async function compile(source: string) {
  const options = await applySatteriPreset({ rehypeCodeOptions: false })('bundler');
  const { code } = await compileMdx({ source, filePath: '/test.mdx', options });
  return code;
}

function tocExport(code: string) {
  const line = code.split('\n').find((l) => l.startsWith('export const toc'));
  expect(line).toBeDefined();
  return JSON.parse(line!.slice('export const toc = '.length, -1)) as {
    title: string;
    url: string;
    depth: number;
  }[];
}

describe('rehype-toc', () => {
  it('exports toc from rendered headings', async () => {
    const code = await compile('## One\n\n## Two');

    expect(tocExport(code)).toEqual([
      { title: 'One', depth: 2, url: '#one' },
      { title: 'Two', depth: 2, url: '#two' },
    ]);
  });

  it('excludes [!toc] headings and strips the tag from output', async () => {
    const code = await compile('## Visible\n\n## Hidden [!toc]');
    const rendered = code.slice(0, code.indexOf('export const'));

    expect(tocExport(code)).toEqual([{ title: 'Visible', depth: 2, url: '#visible' }]);
    expect(rendered).toContain('"Hidden"');
    expect(rendered).not.toContain('[!toc]');
  });

  it('keeps [toc] headings in toc but removes them from output', async () => {
    const code = await compile('## Toc Only [toc]\n\n## Normal');
    const rendered = code.slice(0, code.indexOf('export const'));

    const items = tocExport(code);
    expect(items.map((item) => item.title)).toEqual(['Toc Only', 'Normal']);
    // the heading element itself is removed from the page
    expect(rendered).not.toContain('Toc Only');
  });
});
