import { describe, expect, test } from 'vitest';
import {
  compileHandle,
  convertMdastToHastHandle,
  createMdastHandle,
  createMdxMdastHandle,
  dropHandle,
  resolveHastSubscriptions,
  visitHastHandle,
  type HastPluginDefinition,
} from 'satteri';
import {
  createExportAnchor,
  EXPORT_ANCHOR_ID,
  isExportAnchor,
  type DocumentFormat,
} from '@/export-anchor';
import type { ExtraPluginHooks } from '@/compile';

/** Exercises the anchor alone, without the preset plugins `compileMdx` brings. */
function compile(format: DocumentFormat, source: string, hooks: ExtraPluginHooks[] = []) {
  const anchor = createExportAnchor(format);
  const features = { gfm: true, frontmatter: false, directive: true };
  const withAnchor = anchor.append(source);

  const mdast =
    format === 'mdx'
      ? createMdxMdastHandle(withAnchor, features)
      : createMdastHandle(withAnchor, features);
  const hast = convertMdastToHastHandle(mdast);

  try {
    const input = anchor.plugin(hooks);
    const plugin = (typeof input === 'function' ? input() : input) as HastPluginDefinition;
    visitHastHandle(
      hast,
      plugin,
      resolveHastSubscriptions(plugin),
      withAnchor,
      undefined,
      { frontmatter: { title: 'Doc' } },
      format === 'mdx' ? 'mdx' : 'markdown',
    );
    return compileHandle(hast, { outputFormat: 'function-body' });
  } finally {
    dropHandle(hast);
  }
}

const formats: DocumentFormat[] = ['md', 'mdx'];

describe('isExportAnchor', () => {
  test.each([
    ['mdxFlowExpression', `/*${EXPORT_ANCHOR_ID}*/`],
    ['mdxTextExpression', `/*${EXPORT_ANCHOR_ID}*/`],
    ['html', `<!--${EXPORT_ANCHOR_ID}-->`],
    ['raw', `<!--${EXPORT_ANCHOR_ID}-->`],
  ])('matches the anchor as a %s node', (type, value) => {
    expect(isExportAnchor({ type, value })).toBe(true);
  });

  test('ignores nodes of the right type that are not the anchor', () => {
    expect(isExportAnchor({ type: 'raw', value: '<!-- a note -->' })).toBe(false);
    expect(isExportAnchor({ type: 'html', value: '<div>x</div>' })).toBe(false);
    expect(isExportAnchor({ type: 'text', value: EXPORT_ANCHOR_ID })).toBe(false);
    expect(isExportAnchor({ type: 'raw' })).toBe(false);
  });
});

describe.each(formats)('export anchor (%s)', (format) => {
  test('the marker survives its own parser and reaches the visitor', () => {
    const code = compile(format, '# Heading\n');

    // reached the visitor: frontmatter comes from `ctx.data`, not the source
    expect(code).toContain('const frontmatter = {');
    expect(code).toContain('"title": "Doc"');
  });

  test('collectExports hooks contribute exports', () => {
    const hooks: ExtraPluginHooks[] = [
      {
        collectExports({ addExport }) {
          addExport('toc', JSON.stringify([{ depth: 1 }]));
        },
      },
    ];
    const code = compile(format, '# Heading\n', hooks);

    expect(code).toContain('const toc = [');
    expect(code).toMatch(/return\s*{[^}]*\btoc\b/s);
  });

  test('a later export of the same name replaces the earlier one', () => {
    const hooks: ExtraPluginHooks[] = [
      { collectExports: ({ addExport }) => addExport('dup', '"first"') },
      { collectExports: ({ addExport }) => addExport('dup', '"second"') },
    ];
    const code = compile(format, '# Heading\n', hooks);

    expect(code).toContain('"second"');
    expect(code).not.toContain('"first"');
  });

  test('the anchor leaves nothing behind in the output', () => {
    const code = compile(format, '# Heading\n\nSome text.\n');

    expect(code).not.toContain(EXPORT_ANCHOR_ID);
    expect(code).not.toContain('<!--');
  });

  test('the document itself still compiles', () => {
    const code = compile(format, '# Heading\n\nSome text.\n');

    expect(code).toContain('Heading');
    expect(code).toContain('Some text.');
  });
});

describe('format-specific markers', () => {
  test('mdx uses an MDX comment, md uses an HTML comment', () => {
    expect(createExportAnchor('mdx').append('x')).toContain(`{/*${EXPORT_ANCHOR_ID}*/}`);
    expect(createExportAnchor('md').append('x')).toContain(`<!--${EXPORT_ANCHOR_ID}-->`);
  });

  test('the MDX marker would not survive a CommonMark parse', () => {
    // `/*...*/` becomes emphasis, so it arrives as three inline nodes the
    // visitor never sees, and renders as visible text
    const code = compile('md', `# Heading\n\n{/*${EXPORT_ANCHOR_ID}*/}\n`);

    expect(code).toContain('em: "em"');
    expect(code).toContain('"{/"');
    expect(code).toContain('"/}"');
    expect(code).toContain(EXPORT_ANCHOR_ID);
  });

  test('exports are declared once, at the anchor', () => {
    const code = compile('md', '# One\n\n# Two\n');

    expect(code.match(/const frontmatter =/g)).toHaveLength(1);
  });
});
