import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@mdx-js/mdx';
import { remarkLLMs } from '@/mdx-plugins/remark-llms';
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
    > Some *content* here.
    >
    > <Tabs items={["a","b"]}>
    > nested
    > </Tabs>

    Ending paragraph."
  `);
});
