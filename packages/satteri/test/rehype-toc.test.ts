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
  return line!.slice('export const toc = '.length, -1);
}

describe('rehype-toc', () => {
  it('exports toc from rendered headings', async () => {
    const code = await compile('## One\n\n## Two');

    expect(tocExport(code)).toMatchInlineSnapshot(
      `"[{title: <h2 id="one">{"One"}</h2>,url: "#one",depth: 2,},{title: <h2 id="two">{"Two"}</h2>,url: "#two",depth: 2,}]"`,
    );
  });

  it('excludes [!toc] headings and strips the tag from output', async () => {
    const code = await compile('## Visible\n\n## Hidden [!toc]');
    const rendered = code.slice(0, code.indexOf('export const'));

    expect(tocExport(code)).toMatchInlineSnapshot(
      `"[{title: <h2 id="visible">{"Visible"}</h2>,url: "#visible",depth: 2,}]"`,
    );
    expect(rendered).toContain('"Hidden"');
    expect(rendered).not.toContain('[!toc]');
  });

  it('keeps [toc] headings in toc but removes them from output', async () => {
    const code = await compile('## Toc Only [toc]\n\n## Normal');
    const rendered = code.slice(0, code.indexOf('export const'));

    expect(tocExport(code)).toMatchInlineSnapshot(
      `"[{title: <h2 id="toc-only-toc">{"Toc Only [toc]"}</h2>,url: "#toc-only-toc",depth: 2,},{title: <h2 id="normal">{"Normal"}</h2>,url: "#normal",depth: 2,}]"`,
    );
    // the heading element itself is removed from the page
    expect(rendered).not.toContain('Toc Only');
  });
});
