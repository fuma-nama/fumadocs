import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { createElement, type FC } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as server from 'fumadocs-core/server';
import { createHeadingIds } from 'fumadocs-core/mdx-plugins/remark-heading.runtime';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { renderStructuredData, type StructuredDataNodes } from '../../shared/structured-data';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkInclude } from '@/remark-include';
import { remarkLlms } from '@/remark-llms';

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;

const source = `# Deploy on {props.framework}

<span data-framework={props.framework} />

A {props.framework === "next" && "x"} B {true}

<show when={props.edition === "pro"}>
## Pro
</show>

## Overview

Shared.

<show when={props.framework === "astro"}>
## Setup

Astro only.
</show>

After the branch.

<show when={props.framework === "waku"}>Waku detects the **platform**.</show>

<show when={props.framework === "astro" && props.pm === "pnpm"}>
## With pnpm
</show>

1. First.
2. <show when={props.framework === "waku"}>
     Waku, on two
     lines.
   </show>
   <show when={props.framework === "astro"}>
     Astro.
   </show>

<show when={props.framework === "waku"}>
## Setup
</show>`;

test('Remark Show: branches and expressions render from code in every output', async () => {
  const options = await applySatteriPreset({ mdastPlugins: [remarkLlms()] })('runtime');
  const { code, data } = await compileMdx({
    source,
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  // the generated imports of Fumadocs read from the scope
  const page = (await new AsyncFunction('opts', code)({
    ...JsxRuntime,
    ...server,
    createHeadingIds,
  })) as {
    default: FC<object>;
    toc: (props: object) => { url: string }[];
    structuredData: (props: object) => StructuredDataNodes;
    _markdown: FC<object>;
  };
  const outputs = async (props: object) => ({
    toc: page.toc(props).map((item) => item.url),
    structured: await renderStructuredData(page.structuredData(props)),
    markdown: await server.renderToMarkdown(createElement(page._markdown, props)),
    html: renderToStaticMarkup(createElement(page.default, props)),
  });

  const astro = await outputs({ framework: 'astro' });
  const waku = await outputs({ framework: 'waku' });
  const pnpm = await outputs({ framework: 'astro', pm: 'pnpm' });

  // every output keeps only the branches that show, IDs read the props
  expect(astro.toc).toEqual(['#deploy-on-astro', '#overview', '#setup']);
  // a heading in two branches has the same ID in both
  expect(waku.toc).toEqual(['#deploy-on-waku', '#overview', '#setup']);
  expect(pnpm.toc).toContain('#with-pnpm');
  expect(astro.structured.headings.map((item) => item.content)).toEqual([
    'Deploy on astro',
    'Overview',
    'Setup',
  ]);
  expect(waku.structured.contents.map((item) => item.content)).toContain(
    'Waku detects the **platform**.',
  );
  expect(astro.structured.contents.map((item) => item.content)).not.toContain(
    'Waku detects the **platform**.',
  );
  // content after a branch belongs to the last heading that shows with it
  const after = (data: StructuredData) =>
    data.contents.find((item) => item.content === 'After the branch.')?.heading;
  expect(after(astro.structured)).toBe('setup');
  expect(after(waku.structured)).toBe('overview');
  // expressions are values, constants are decided
  expect(waku.markdown).toContain('# Deploy on waku [#deploy-on-waku]');
  expect(waku.html).toContain('<h1 id="deploy-on-waku">Deploy on waku</h1>');
  expect(waku.markdown).not.toContain('Pro');
  expect(waku.markdown).toContain('Waku detects the **platform**.');
  expect(astro.markdown).toContain('Astro only.');
  expect(waku.markdown).not.toContain('Astro only.');
  expect(waku.markdown).not.toMatch(/\n{3,}/);
  // a branch in a list item keeps its prefixes, the whitespace after a branch goes with it
  expect(waku.markdown).toContain('2. Waku, on two\n   lines.');
  expect(astro.markdown).toContain('2. Astro.');

  expect(waku.html).toContain('data-framework="waku"');
  // booleans render nothing
  expect(waku.html).toContain('<p>A  B </p>');
  expect(astro.html).not.toContain('With pnpm');
  expect(pnpm.html).toContain('With pnpm');

  // the static view has the authored source of expressions and every branch
  expect((data.structuredData as StructuredData).headings[0].content).toBe(
    'Deploy on {props.framework}',
  );
});

test('Remark Show: static outputs analyse the source', async () => {
  const output = 'static';
  const options = await applySatteriPreset({ output, mdastPlugins: [remarkLlms({ output })] })(
    'runtime',
  );
  const { code } = await compileMdx({
    source: '## Deploy on {props.framework}\n\n<show when={props.a}>\nAstro.\n</show>\n',
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  const page = (await new AsyncFunction('opts', code)({
    ...JsxRuntime,
    ...server,
    createHeadingIds,
  })) as {
    toc: { url: string }[];
    structuredData: StructuredData;
    _markdown: string;
  };
  expect(page.toc.map((item) => item.url)).toEqual(['#deploy-on-']);
  expect(page.structuredData.headings[0].content).toBe('Deploy on {props.framework}');
  expect(page._markdown).toBe('## Deploy on {props.framework} [#deploy-on-]\n\nAstro.\n');
});

test('Remark Show: code tabs end at a branch', async () => {
  const options = await applySatteriPreset({})('runtime');
  const { code } = await compileMdx({
    source:
      '```ts tab="Shared"\na\n```\n\n<show when={props.framework === "astro"}>\n```ts tab="Astro"\nb\n```\n</show>\n',
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  expect(code.match(/defaultValue:/g)).toHaveLength(2);
});

test('Remark Show: branches with included files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'remark-show-'));
  await fs.writeFile(path.join(dir, 'shared.mdx'), '## Shared\n\nShared text.\n');
  await fs.writeFile(
    path.join(dir, 'branchy.mdx'),
    '## Inner\n\n<show when={props.edition === "pro"}>\nIncluded branch.\n</show>\n',
  );
  const options = await applySatteriPreset({})('runtime');
  const { code } = await compileMdx({
    source:
      '# Page\n\n<show when={props.edition === "pro"}>\nWaku.\n\n<include>./shared.mdx</include>\n</show>\n\n<include>./branchy.mdx</include>\n\nEnd.\n',
    filePath: path.join(dir, 'page.mdx'),
    environment: 'runtime',
    options: {
      ...options,
      mdastPlugins: [remarkInclude({ cwd: dir }), ...options.mdastPlugins!, remarkLlms()],
    },
  });
  const page = (await new AsyncFunction('opts', code)({
    ...JsxRuntime,
    ...server,
    createHeadingIds,
  })) as {
    _markdown: FC<object>;
  };
  const markdown = (props: object) => server.renderToMarkdown(createElement(page._markdown, props));

  expect(await markdown({ edition: 'pro' })).toBe(
    '# Page [#page]\n\nWaku.\n\n## Shared [#shared]\n\nShared text.\n\n## Inner [#inner]\n\nIncluded branch.\n\nEnd.',
  );
  expect(await markdown({})).toBe('# Page [#page]\n\n## Inner [#inner]\n\nEnd.');
  await fs.rm(dir, { recursive: true });
});

test('Remark Show: branches of an included file, the page itself has none', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'remark-show-'));
  await fs.writeFile(
    path.join(dir, 'branchy.mdx'),
    '<show when={props.edition === "pro"}>\nIncluded branch.\n</show>\n',
  );
  const options = await applySatteriPreset({})('runtime');
  const { code } = await compileMdx({
    source: '# Page\n\n<include>./branchy.mdx</include>\n',
    filePath: path.join(dir, 'page.mdx'),
    environment: 'runtime',
    options: {
      ...options,
      mdastPlugins: [remarkInclude({ cwd: dir }), ...options.mdastPlugins!, remarkLlms()],
    },
  });
  const page = (await new AsyncFunction('opts', code)({
    ...JsxRuntime,
    ...server,
    createHeadingIds,
  })) as {
    _markdown: FC<object>;
  };
  const markdown = (props: object) => server.renderToMarkdown(createElement(page._markdown, props));
  expect(await markdown({})).not.toContain('Included branch.');
  expect(await markdown({ edition: 'pro' })).toContain('Included branch.');
  await fs.rm(dir, { recursive: true });
});
