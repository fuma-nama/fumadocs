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
  const content = (await fs.readFile(path.join(dir, file))).toString();

  test(
    `compile: ${file}`,
    async () => {
      const out = await compileMDX({
        skipRender: true,
        source: content,
      });

      await expect(out.compiled).toMatchFileSnapshot(`${file}.js`);
      await expect({
        toc: out.toc,
        frontmatter: out.frontmatter,
      }).toMatchFileSnapshot(`${file}.json`);
    },
    1000 * 15,
  );

  test(
    `compile: ${file} (production)`,
    async () => {
      const out = await compileMDX({
        skipRender: true,
        mdxOptions: {
          development: false,
        },
        source: content,
      });

      await expect(out.compiled).toMatchFileSnapshot(`${file}.production.js`);
      await expect({
        toc: out.toc,
        frontmatter: out.frontmatter,
      }).toMatchFileSnapshot(`${file}.json`);
    },
    1000 * 15,
  );
}
