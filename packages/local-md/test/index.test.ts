import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMarkdownCompiler, MarkdownCompiler } from '@/md/compiler-full';
import { createMarkdownRenderer } from '@/md/renderer';
import type { RawPage } from '@/storage';
import type { TOCItemType } from 'fumadocs-core/toc';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(cwd, 'fixtures');

async function readFixture(name: string) {
  const filePath = path.join(fixturesDir, name);
  const content = await fs.readFile(filePath, 'utf8');
  return { filePath, content };
}

function serializeToc(toc: TOCItemType[] | undefined) {
  if (!toc?.length) return [];
  return toc.map((item) => ({
    url: item.url,
    depth: item.depth,
    _step: item._step,
    titleHtml: renderToStaticMarkup(item.title),
  }));
}

function serializeRenderer(page: RawPage<Record<string, unknown>>, compiler: MarkdownCompiler) {
  const renderer = createMarkdownRenderer(compiler);
  return renderer.compile(page);
}

const cases = [
  { name: 'simple', file: 'simple.md' },
  { name: 'rich', file: 'rich.md' },
  { name: 'expressions', file: 'expressions.mdx' },
  { name: 'jsx', file: 'jsx.mdx' },
] as const;

for (const { name, file } of cases) {
  test(`compiler: ${name}`, async () => {
    const { filePath, content } = await readFixture(file);
    const compiler = createMarkdownCompiler();
    const { tree, file: vfile } = await compiler.compile({ path: filePath, value: content });

    const payload = {
      tree,
      data: {
        structuredData: vfile.data.structuredData,
        rehypeToc: vfile.data.rehypeToc,
      },
    };

    await expect(JSON.stringify(payload, null, 2)).toMatchFileSnapshot(
      path.join(fixturesDir, `${name}.compiler.json`),
    );
  });

  test(`renderer: ${name}`, async () => {
    const { filePath, content } = await readFixture(file);
    const compiler = createMarkdownCompiler();
    const pageRenderer = await serializeRenderer(
      {
        path: file,
        absolutePath: filePath,
        title: name,
        content,
        frontmatter: {},
      },
      compiler,
    );

    const { body, toc } = await pageRenderer.render();
    const payload = {
      structuredData: pageRenderer.structuredData,
      bodyHtml: renderToStaticMarkup(body),
      toc: serializeToc(toc),
    };

    await expect(JSON.stringify(payload, null, 2)).toMatchFileSnapshot(
      path.join(fixturesDir, `${name}.renderer.json`),
    );
  });
}
