import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkInclude } from '@/remark-include';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/remark-include');
const entryPath = path.join(fixtures, 'entry.mdx');

async function compile(source: string, data: Record<string, unknown> = {}) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    data,
    mdastPlugins: [remarkInclude()],
  })('bundler');

  return compileMdx({ source, filePath: entryPath, options });
}

describe('remark-include', () => {
  it('includes a markdown file, stripping its frontmatter', async () => {
    const { code } = await compile('# Entry\n\n<include>./content.mdx</include>');

    expect(code).toContain('Content Heading');
    expect(code).toContain('bold-marker');
    // frontmatter of the included file must not leak in
    expect(code).not.toContain('Included Doc');
  });

  it('supports the :::include container directive', async () => {
    const { code } = await compile(':::include\n./content.mdx\n:::');

    expect(code).toContain('bold-marker');
  });

  it('supports the ::include leaf directive', async () => {
    const { code } = await compile('::include[./content.mdx]');

    expect(code).toContain('bold-marker');
  });

  it('extracts a section by generated heading slug', async () => {
    const { code } = await compile('<include>./sections.mdx#usage</include>');

    expect(code).toContain('usage-marker');
    expect(code).toContain('more-usage-marker');
    expect(code).not.toContain('setup-marker');
    expect(code).not.toContain('other-marker');
  });

  it('extracts a section by custom heading id', async () => {
    const { code } = await compile('<include>./sections.mdx#setup</include>');

    expect(code).toContain('setup-marker');
    expect(code).not.toContain('usage-marker');
  });

  it('extracts a section wrapped in a <section> tag', async () => {
    const { code } = await compile('<include>./sections.mdx#custom</include>');

    expect(code).toContain('custom-marker');
    expect(code).not.toContain('usage-marker');
  });

  it('throws a descriptive error for a missing section', async () => {
    await expect(compile('<include>./sections.mdx#missing</include>')).rejects.toThrow(
      /Cannot find section missing/,
    );
  });

  it('includes a non-markdown file as a code block', async () => {
    const { code } = await compile('<include>./code.ts</include>');

    expect(code).toContain('language-ts');
    expect(code).toContain('main-marker');
  });

  it('overrides the code block language with the lang attribute', async () => {
    const { code } = await compile('<include lang="js">./content.mdx</include>');

    // lang forces code mode even for markdown files
    expect(code).toContain('language-js');
    expect(code).toContain('bold-marker');
  });

  it('extracts VS Code-style regions from code files', async () => {
    const { code } = await compile('<include>./code.ts#setup</include>');

    expect(code).toContain('region-marker');
    expect(code).not.toContain('main-marker');
    expect(code).not.toContain('#region');
  });

  it('throws for an unknown region', async () => {
    await expect(compile('<include>./code.ts#nope</include>')).rejects.toThrow(
      /Region "nope" not found/,
    );
  });

  it('resolves nested includes relative to the file containing them', async () => {
    const { code } = await compile('<include>./nested/inner.mdx</include>');

    expect(code).toContain('inner-marker');
    // deep.md sits next to inner.mdx, not next to the entry file
    expect(code).toContain('deep-marker');
  });

  it('embeds nested code includes as fenced blocks', async () => {
    const { code } = await compile('<include>./with-code.mdx</include>');

    expect(code).toContain('before-code-marker');
    expect(code).toContain('region-marker');
    expect(code).toContain('language-ts');
  });

  it('rejects circular includes instead of hanging', async () => {
    await expect(compile('<include>./cycle-a.mdx</include>')).rejects.toThrow(/Circular include/);
  });

  it('wraps read failures with the include path', async () => {
    await expect(compile('<include>./does-not-exist.mdx</include>')).rejects.toThrow(
      /failed to read file .*does-not-exist\.mdx/,
    );
  });

  it('reports every included file as a compiler dependency', async () => {
    const dependencies: string[] = [];
    await compile('<include>./nested/inner.mdx</include>', {
      _compiler: { addDependency: (file: string) => dependencies.push(file) },
    });

    expect(dependencies).toContain(path.join(fixtures, 'nested/inner.mdx'));
    expect(dependencies).toContain(path.join(fixtures, 'nested/deep.md'));
  });

  it('resolves from the configured cwd when the cwd attribute is set', async () => {
    const options = await applySatteriPreset({
      preset: 'minimal',
      mdastPlugins: [remarkInclude({ cwd: fixtures })],
    })('bundler');

    const { code } = await compileMdx({
      source: '<include cwd>./content.mdx</include>',
      filePath: path.join(fixtures, 'nested/entry.mdx'),
      options,
    });

    expect(code).toContain('bold-marker');
  });
});
