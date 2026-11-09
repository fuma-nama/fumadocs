import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkMdxFiles } from '@/remark-mdx-files';
import { remarkLlms } from '@/remark-llms';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function compile(source: string, filePath = '/test.mdx') {
  const options = await applySatteriPreset({
    rehypeCodeOptions: false,
    mdastPlugins: [remarkMdxFiles(), remarkLlms({ analysis: 'static' })],
  })('bundler');

  return compileMdx({ source, filePath, options });
}

describe('remark-mdx-files', () => {
  it('converts files code blocks into Files components', async () => {
    const source = '```files\nproject\n├── src\n│   └── index.js\n└── package.json\n```';
    const { code, data } = await compile(source);

    expect(code).toContain('_jsx(Files, {');
    expect(code).toMatch(/name: "project",\s*defaultOpen: true/);
    expect(code).toMatch(/name: "src",\s*defaultOpen: true/);
    expect(code).toContain('name: "index.js"');
    expect(code).toContain('name: "package.json"');
    // the Markdown keeps the authored code block
    expect(data.markdown).toBe(`${source}\n`);
  });

  it('keeps several top-level entries', async () => {
    const { code } = await compile('```files\nsrc/\n  index.js\npackage.json\n```');

    expect(code).toMatch(/name: "src\/",\s*defaultOpen: true/);
    expect(code).toContain('name: "index.js"');
    expect(code).toContain('_jsx(File, { name: "package.json" })');
    expect(code).not.toContain('name: ""');
  });

  it('ignores other code blocks', async () => {
    const { code } = await compile('```js\nconst a = 1\n```');

    expect(code).not.toContain('Files');
  });

  it('generates Files components from the file system', async () => {
    const { code, data } = await compile(
      '<auto-files dir="./remark-include" pattern="nested/*.mdx" defaultOpenAll />',
      path.join(fixtures, 'page.mdx'),
    );

    expect(code).toContain('_jsx(Files, {');
    expect(code).toContain('_jsx(File, { name: "inner.mdx" })');
    expect(code).toMatch(/name: "remark-include",\s*defaultOpen: true/);
    expect(code).toMatch(/name: "nested",\s*defaultOpen: true/);
    expect(data.markdown).toBe('```\nnested/inner.mdx\n```\n');
  });

  it('requires a pattern for auto-files', async () => {
    await expect(compile('<auto-files dir="." />')).rejects.toThrow('Missing `pattern`');
  });
});
