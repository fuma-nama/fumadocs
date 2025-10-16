import { expect, test } from 'vitest';
import { createCompiler } from '@/compile';
import { glob } from 'tinyglobby';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFrontmatter } from '@/utils';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = await glob('./fixtures/*.mdx', {
  cwd: dir,
});

const compiler = createCompiler({
  development: true,
  rehypeCodeOptions: {
    lazy: true,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});

const compilerProduction = createCompiler({
  development: false,
  rehypeCodeOptions: {
    lazy: true,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});

for (const file of files) {
  const raw = (await fs.readFile(path.join(dir, file))).toString();
  const { frontmatter, content } = parseFrontmatter(raw);

  test(`compile: ${file}`, async () => {
    const out = await compiler.compileFile({
      value: content,
      data: {
        frontmatter,
      },
    });

    await expect(String(out)).toMatchFileSnapshot(`${file}.js`);
    await expect(out.data).toMatchFileSnapshot(`${file}.json`);
  });

  test(`compile: ${file} (production)`, async () => {
    const out = await compilerProduction.compileFile({
      value: content,
      data: {
        frontmatter,
      },
    });

    await expect(String(out)).toMatchFileSnapshot(`${file}.production.js`);
    await expect(out.data).toMatchFileSnapshot(`${file}.json`);
  });

  test(`compile & execute: ${file}`, async () => {
    const out = await compilerProduction.compile({
      source: raw,
      scope: {
        custom_scope_variable: 'test',
      },
    });

    await expect(out.compiled).toMatchFileSnapshot(`${file}.full.js`);
    expect(out.toc).toBe(out.exports?.toc);

    // no error should be thrown
    out.body({});
  });
}
