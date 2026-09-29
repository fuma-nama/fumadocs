import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileMdx, type DocumentFormat } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { createMarkdownCompiler } from '@/local-md';
import { fromJS } from '@/local-md/renderer';

/** Compile and render, so the assertions are about output rather than codegen. */
async function render(source: string, file: string) {
  const out = await createMarkdownCompiler().compile({
    path: `/tmp/${file}`,
    value: `${source}\n`,
  });
  const { body, toc } = await fromJS({ code: out.code, filePath: out.filePath }).render();
  return { html: renderToStaticMarkup(body), toc, structuredData: out.structuredData };
}

describe('.md gets CommonMark semantics', () => {
  test.each([
    ['an HTML comment is raw HTML, not an MDX comment', '<!-- a note -->', ''],
    ['a void tag is raw HTML, not JSX', 'line<br>break', '<p>linebreak</p>'],
    [
      'an unknown tag is raw HTML, not a component',
      'Text with <not-a-tag> in.',
      '<p>Text with  in.</p>',
    ],
    [
      'braces around an identifier are literal',
      'Use the {config} option.',
      '<p>Use the {config} option.</p>',
    ],
    ['braces around a number are literal', 'Costs {100} dollars.', '<p>Costs {100} dollars.</p>'],
    ['a block-level element is raw HTML', '<div class="x">raw</div>', ''],
  ])('%s', async (_name, source, expected) => {
    const { html } = await render(source, 'doc.md');
    expect(html).toBe(expected);
  });

  test.each([
    ['a bare `<` is text', 'a < b', '<p>a &lt; b</p>'],
    [
      'generics in inline code are untouched',
      'see `Map<string>`',
      '<p>see <code>Map&lt;string&gt;</code></p>',
    ],
  ])('%s', async (_name, source, expected) => {
    const { html } = await render(source, 'doc.md');
    expect(html).toBe(expected);
  });
});

describe('.mdx behaviour is unchanged', () => {
  test.each([
    ['an HTML comment is a parse error', '<!-- a note -->'],
    ['a void tag needs closing', 'line<br>break'],
    ['an unknown tag needs closing', 'Text with <not-a-tag> in.'],
  ])('%s', async (_name, source) => {
    await expect(render(source, 'doc.mdx')).rejects.toThrow();
  });

  test('braces are an expression', async () => {
    // an undefined identifier still throws at render, as it did before
    await expect(render('Use the {config} option.', 'doc.mdx')).rejects.toThrow(
      /config is not defined/,
    );
    const { html } = await render('Costs {100} dollars.', 'doc.mdx');
    expect(html).toBe('<p>Costs 100 dollars.</p>');
  });

  test('raw HTML is JSX, and is kept', async () => {
    const { html } = await render('<div className="x">raw</div>', 'doc.mdx');
    expect(html).toBe('<div class="x">raw</div>');
  });
});

describe('the plugin pipeline runs on both formats', () => {
  test.each<DocumentFormat>(['md', 'mdx'])(
    '%s keeps headings, toc and structuredData',
    async (format) => {
      const { html, toc, structuredData } = await render(
        '# Hello\n\nSome text.\n\n## Sub\n',
        `doc.${format}`,
      );

      expect(html).toContain('<h1 id="hello">Hello</h1>');
      expect(toc.map((item) => item.url)).toEqual(['#hello', '#sub']);
      expect(structuredData?.headings).toHaveLength(2);
    },
  );

  test.each<DocumentFormat>(['md', 'mdx'])('%s highlights code blocks', async (format) => {
    const { html } = await render('```js\nconst a = 1;\n```\n', `doc.${format}`);

    expect(html).toContain('<pre');
    expect(html).toContain('shiki');
  });

  test.each<DocumentFormat>(['md', 'mdx'])('%s exports frontmatter', async (format) => {
    const options = await applySatteriPreset()('runtime');
    const { code } = await compileMdx({
      source: '# Doc\n',
      filePath: `/tmp/doc.${format}`,
      frontmatter: { title: 'Doc' },
      environment: 'runtime',
      options,
    });

    expect(code).toContain('const frontmatter =');
    expect(code).toContain('"title": "Doc"');
  });
});

describe('format resolution', () => {
  test('defaults to the file extension', async () => {
    const md = await compileMdx({
      source: 'Use {braces}.\n',
      filePath: '/tmp/doc.md',
      environment: 'runtime',
      options: await applySatteriPreset()('runtime'),
    });
    expect(md.code).toContain('Use {braces}.');
  });

  test('an explicit format overrides the extension', async () => {
    // a `.txt` path would default to 'md'; asking for mdx must parse as MDX
    await expect(
      compileMdx({
        source: 'line<br>break\n',
        filePath: '/tmp/doc.txt',
        format: 'mdx',
        environment: 'runtime',
        options: await applySatteriPreset()('runtime'),
      }),
    ).rejects.toThrow(/closing tag/);
  });

  test('the anchor leaves no trace in either format', async () => {
    for (const format of ['md', 'mdx'] as const) {
      const { code } = await compileMdx({
        source: '# Doc\n',
        filePath: `/tmp/doc.${format}`,
        environment: 'runtime',
        options: await applySatteriPreset()('runtime'),
      });
      expect(code).not.toContain('fd-exports-anchor');
    }
  });
});
