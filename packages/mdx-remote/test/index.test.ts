import { expect, test } from 'vitest';
import { compileMDX } from '@/compile';
import Glob from 'fast-glob';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = await Glob('./fixtures/*.mdx', {
  cwd: dir,
});

for (const file of files) {
  test(`compile: ${file}`, async () => {
    const out = await compileMDX({
      source: (await fs.readFile(path.join(dir, file))).toString(),
    });

    await expect(out.compiled).toMatchFileSnapshot(`${file}.js`);
    await expect({
      toc: out.toc,
      frontmatter: out.frontmatter,
    }).toMatchFileSnapshot(`${file}.json`);
  });

  test(`compile: ${file} (production)`, async () => {
    const out = await compileMDX({
      mdxOptions: {
        development: false,
      },
      source: (await fs.readFile(path.join(dir, file))).toString(),
    });

    await expect(out.compiled).toMatchFileSnapshot(`${file}.production.js`);
    await expect({
      toc: out.toc,
      frontmatter: out.frontmatter,
    }).toMatchFileSnapshot(`${file}.json`);
  });
}
