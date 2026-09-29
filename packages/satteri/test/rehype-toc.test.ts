import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';

async function compile(source: string) {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    // structuredData contains the raw heading text (tags included), which
    // would pollute the rendered-body assertions below
    remarkStructureOptions: false,
  })('bundler');
  const { code } = await compileMdx({ source, filePath: '/test.mdx', options });
  return code;
}

// The toc is emitted as an `mdxjsEsm` node prepended to the document root, so
// the export appears near the top of the module and is pretty-printed across
// multiple lines by the MDX compiler.
const TocExportRegex = /export const toc = (\[[^]*?\]);/;

function tocExport(code: string) {
  const match = TocExportRegex.exec(code);
  expect(match).not.toBeNull();
  return match![1]!;
}

/** The compiled module without the toc export — the rendered page body. */
function withoutToc(code: string) {
  return code.replace(TocExportRegex, '');
}

describe('rehype-toc', () => {
  it('exports toc from rendered headings', async () => {
    const code = await compile('## One\n\n## Two');

    expect(tocExport(code)).toMatchInlineSnapshot(`
      "[{
          title: _jsx(_Fragment, { children: "One" }),
          url: "#one",
          depth: 2
      }, {
          title: _jsx(_Fragment, { children: "Two" }),
          url: "#two",
          depth: 2
      }]"
    `);
  });

  it('excludes [!toc] headings and strips the tag from output', async () => {
    const code = await compile('## Visible\n\n## Hidden [!toc]');
    const rendered = withoutToc(code);

    expect(tocExport(code)).toMatchInlineSnapshot(`
      "[{
          title: _jsx(_Fragment, { children: "Visible" }),
          url: "#visible",
          depth: 2
      }]"
    `);
    expect(rendered).toContain('"Hidden"');
    expect(rendered).not.toContain('[!toc]');
  });

  it('keeps [toc] headings in toc but removes them from output', async () => {
    const code = await compile('## Toc Only [toc]\n\n## Normal');
    const rendered = withoutToc(code);

    expect(tocExport(code)).toMatchInlineSnapshot(`
      "[{
          title: _jsx(_Fragment, { children: "Toc Only" }),
          url: "#toc-only-toc",
          depth: 2
      }, {
          title: _jsx(_Fragment, { children: "Normal" }),
          url: "#normal",
          depth: 2
      }]"
    `);
    // the heading element itself is removed from the page
    expect(rendered).not.toContain('Toc Only');
  });
});
