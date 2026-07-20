import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { executorNative } from '@/js/executor-native';
import { CompileResult, createMarkdownCompiler } from '@/md/compiler';
import { fromAst, fromJS } from '@/md/renderer';
import { localMd } from '@/index';
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

function getRenderer(result: CompileResult) {
  if (result.type === 'ast')
    return fromAst({
      filePath: result.file.path,
      tree: result.tree,
      rehypeToc: result.file.data.rehypeToc,
      structuredData: result.file.data.structuredData,
    });

  return fromJS({
    filePath: result.file.path,
    code: result.code,
    structuredData: result.file.data.structuredData,
  });
}

function getRendererNative(result: CompileResult) {
  if (result.type === 'ast')
    return fromAst({
      filePath: result.file.path,
      tree: result.tree,
      rehypeToc: result.file.data.rehypeToc,
      structuredData: result.file.data.structuredData,
      executor: executorNative,
    });

  return fromJS({
    filePath: result.file.path,
    code: result.code,
    baseUrl: pathToFileURL(result.file.path).href,
    structuredData: result.file.data.structuredData,
  });
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
    const out = await compiler.compile({ path: filePath, value: content });

    const payload =
      out.type === 'ast'
        ? {
            tree: out.tree,
            data: out.file.data,
          }
        : {
            code: out.code,
            data: out.file.data,
          };

    await expect(JSON.stringify(payload, null, 2)).toMatchFileSnapshot(
      path.join(fixturesDir, `${name}.compiler.json`),
    );
  });

  test(`renderer: ${name}`, async () => {
    const { filePath, content } = await readFixture(file);
    const compiler = createMarkdownCompiler();
    const compiled = await compiler.compile({
      path: filePath,
      value: content,
    });
    const renderer = getRenderer(compiled);
    const { body, toc } = await renderer.render();
    const payload = {
      structuredData: renderer.structuredData,
      bodyHtml: renderToStaticMarkup(body),
      toc: serializeToc(toc),
    };

    await expect(JSON.stringify(payload, null, 2)).toMatchFileSnapshot(
      path.join(fixturesDir, `${name}.renderer.json`),
    );
  });

  test(`renderer (native): ${name}`, async () => {
    const { filePath, content } = await readFixture(file);
    const compiler = createMarkdownCompiler();
    const compiled = await compiler.compile({
      path: filePath,
      value: content,
    });
    const renderer = getRendererNative(compiled);

    const { body, toc } = await renderer.render();
    const payload = {
      structuredData: renderer.structuredData,
      bodyHtml: renderToStaticMarkup(body),
      toc: serializeToc(toc),
    };

    await expect(JSON.stringify(payload, null, 2)).toMatchFileSnapshot(
      path.join(fixturesDir, `${name}.renderer.native.json`),
    );
  });
}

test('fromJS: a user context does not displace the jsx runtime', async () => {
  const { filePath, content } = await readFixture('jsx.mdx');
  const compiled = await createMarkdownCompiler().compile({ path: filePath, value: content });
  if (compiled.type !== 'js') throw new Error('expected a js result');

  const renderer = fromJS({ code: compiled.code, filePath: compiled.file.path });
  const expected = renderToStaticMarkup((await renderer.render()).body);

  // `function-body` output reads its runtime from `arguments[0]`, so extra
  // context keys — including one named `opts` — must not shift it out of place
  for (const context of [{ myVar: 1 }, { a: 1, b: 2 }, { opts: 'not the runtime' }]) {
    expect(renderToStaticMarkup((await renderer.render(undefined, context)).body)).toBe(expected);
    expect(renderToStaticMarkup(renderer.renderSync(undefined, context).body)).toBe(expected);
  }
});

test('load() compiles each page only once', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-md-cache-'));

  try {
    await fs.writeFile(path.join(dir, 'a.md'), '---\ntitle: A\n---\n\n# A\n\ntext\n');

    let compiles = 0;
    const source = await localMd({
      dir,
      mdOptions: { remarkPlugins: [() => () => void compiles++] },
    }).staticSource();

    const page = source.files.find((file) => file.type === 'page');
    if (page?.type !== 'page') throw new Error('expected a page');

    await page.data.load();
    await page.data.load();
    expect(compiles).toBe(1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
