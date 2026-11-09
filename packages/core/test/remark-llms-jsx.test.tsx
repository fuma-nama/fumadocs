import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mdx-js/mdx';
import { remarkLLMs } from '@/mdx-plugins/remark-llms';
import { remarkImage } from '@/mdx-plugins/remark-image';
import { asMarkdown, md, renderToMarkdown } from '@/server';
import type { FC, ReactNode } from 'react';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('Remark LLMs: jsx', async () => {
  const file = path.resolve(cwd, './fixtures/remark-llms-jsx.mdx');
  const content = await fs.readFile(file);
  const compiled = String(
    await compile(content, {
      remarkPlugins: [[remarkLLMs, { output: 'function' }]],
    }),
  );
  await expect(compiled).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-llms-jsx.output.js'),
  );

  // evaluate with the runtime resolved to `src/server.ts`, so it shares the test's module instance
  const evalFile = path.resolve(cwd, './fixtures/remark-llms-jsx.out.js');
  await fs.writeFile(evalFile, compiled.replace('"fumadocs-core/server"', '"../../src/server.ts"'));
  const { _markdown: Md } = (await import(evalFile)) as {
    _markdown: FC<{ components?: Record<string, unknown> }>;
  };
  await fs.rm(evalFile);

  async function Callout({
    title,
    count,
    children,
  }: {
    title?: string;
    count?: number;
    children?: ReactNode;
  }) {
    if (asMarkdown()) return md.linePrefix('> ')`**${title} (${count})**\n${children}`;
    return null;
  }

  await expect(renderToMarkdown(<Md components={{ Callout }} />)).resolves.toMatchInlineSnapshot(`
    "## Hello World

    Content with <Badge type="info">inline **bold**</Badge> element.

    > **Note (2)**
    >
    > Some *content* here.
    >
    > <Tabs items={["a","b"]}>
    > nested
    > </Tabs>

    Ending paragraph."
  `);
});

test('Remark LLMs: URLs of imported images', async () => {
  // a page-relative image, and one in the public directory
  const value = '![Test](./test.png "A \\"title\\"")\n\n![Public](/remark-image.svg)\n';
  const load = async (output: 'function' | 'string') => {
    const compiled = String(
      await compile(
        { value, path: path.resolve(cwd, './fixtures/page.mdx') },
        {
          remarkPlugins: [
            [remarkImage, { publicDir: path.resolve(cwd, './fixtures') }],
            [remarkLLMs, { output }],
          ],
        },
      ),
    );
    const evalFile = path.resolve(cwd, `./fixtures/remark-llms-image-${output}.out.js`);
    await fs.writeFile(
      evalFile,
      compiled.replace('"fumadocs-core/server"', '"../../src/server.ts"'),
    );
    const { _markdown } = await import(evalFile);
    await fs.rm(evalFile);
    return _markdown;
  };

  const expected =
    '![Test](</test/fixtures/test.png> "A \\"title\\"")\n\n![Public](/remark-image.svg)';
  await expect(load('string')).resolves.toBe(`${expected}\n`);
  const Md = (await load('function')) as FC;
  await expect(renderToMarkdown(<Md />)).resolves.toBe(expected);
});
