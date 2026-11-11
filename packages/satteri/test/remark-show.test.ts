import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { createElement, type FC, type ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as server from 'fumadocs-core/server';
import * as headingRuntime from 'fumadocs-core/mdx-plugins/remark-heading.runtime';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { renderStructuredData, type StructuredRecords } from '../../shared/structured-data';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkInclude } from '@/remark-include';
import { remarkLlms } from '@/remark-llms';
import { remarkSteps } from '@/remark-steps';

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;
// the generated imports of Fumadocs read from the scope
const scope = { ...JsxRuntime, ...server, ...headingRuntime };

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
</show>

## Notes {/* draft */}

## Mode <show when={props.framework === "waku"}>Waku</show>`;

test('Remark Show: branches and expressions render from code in every output', async () => {
  const options = await applySatteriPreset({
    data: { unstable_runtimeOutputs: true },
    mdastPlugins: [remarkLlms()],
  })('runtime');
  const { code, data } = await compileMdx({
    source,
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  const page = (await new AsyncFunction('opts', code)(scope)) as {
    default: FC<object>;
    toc: (props: object) => { url: string; title: ReactNode }[];
    structuredData: StructuredRecords;
    _markdown: FC<object>;
  };
  const outputs = async (props: Record<string, unknown>) => ({
    toc: page.toc(props).map((item) => item.url),
    titles: page.toc(props).map((item) => renderToStaticMarkup(item.title)),
    structured: await renderStructuredData(page.structuredData, props),
    markdown: await server.renderToMarkdown(createElement(page._markdown, props)),
    html: renderToStaticMarkup(createElement(page.default, props)),
  });

  const astro = await outputs({ framework: 'astro' });
  const waku = await outputs({ framework: 'waku' });
  const pnpm = await outputs({ framework: 'astro', pm: 'pnpm' });

  // every output keeps only the branches that show, IDs read the props
  // a comment is no text, a branch in a heading counts when it shows
  expect(astro.toc).toEqual(['#deploy-on-astro', '#overview', '#setup', '#notes', '#mode']);
  // a heading in two branches has the same ID in both
  expect(waku.toc).toEqual(['#deploy-on-waku', '#overview', '#setup', '#notes', '#mode-waku']);
  expect(astro.titles.at(-1)).toBe('Mode ');
  expect(waku.titles.at(-1)).toBe('Mode Waku');
  expect(pnpm.toc).toContain('#with-pnpm');
  expect(astro.structured.headings.map((item) => item.content)).toEqual([
    'Deploy on astro',
    'Overview',
    'Setup',
    'Notes',
    'Mode',
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

test('Remark Show: steps and tabs go on through branches', async () => {
  const { jsx } = JsxRuntime;
  const options = await applySatteriPreset({
    data: { unstable_runtimeOutputs: true },
    rehypeCodeOptions: false,
    mdastPlugins: [remarkSteps()],
  })('runtime');
  const { code } = await compileMdx({
    source: `### Install [step]

#### Download [step]

#### Unpack [step]

<show when={props.framework === "waku"}>

### Create the Source [step] [!toc]

</show>

### Done [step]

<show when={props.framework === "astro"}>

\`\`\`ts tab="astro.config.ts"
astro
\`\`\`

</show>

\`\`\`ts tab="lib/source.ts"
source
\`\`\`
`,
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  const page = (await new AsyncFunction('opts', code)(scope)) as {
    default: FC<Record<string, unknown>>;
    toc: (props: object) => { _step?: number }[];
  };
  const components = {
    CodeBlockTabs: (props: { defaultValue: string; children: ReactNode }) =>
      jsx('section', { 'data-default': props.defaultValue, children: props.children }),
    CodeBlockTabsList: (props: { children: ReactNode }) => jsx('nav', props),
    CodeBlockTabsTrigger: (props: { children: ReactNode }) =>
      jsx('b', { children: props.children }),
    CodeBlockTab: (props: { children: ReactNode }) => props.children,
  };
  const html = (framework: string) =>
    renderToStaticMarkup(createElement(page.default, { framework, components }));
  const steps = (framework: string) => page.toc({ framework }).map((item) => item._step);

  // a step in a branch is a step of the list around it, a step that isn't in the TOC counts
  // a list in a step has its own numbers
  expect(steps('waku')).toEqual([1, 1, 2, 3]);
  expect(steps('next')).toEqual([1, 1, 2, 2]);
  expect(html('waku').match(/class="fd-steps?"/g)).toHaveLength(7);
  expect(html('next').match(/class="fd-steps?"/g)).toHaveLength(6);
  // a tab in a branch is a tab of the code blocks around it, the first tab that shows is the default one
  expect(html('astro')).toContain(
    '<section data-default="astro.config.ts"><nav><b>astro.config.ts</b><b>lib/source.ts</b></nav>',
  );
  expect(html('next')).toContain(
    '<section data-default="lib/source.ts"><nav><b>lib/source.ts</b></nav>',
  );
});

test('Remark Show: static outputs analyse the source', async () => {
  const options = await applySatteriPreset({ mdastPlugins: [remarkLlms()] })('runtime');
  const compile = (source: string) =>
    compileMdx({ source, filePath: '/tmp/doc.mdx', environment: 'runtime', options });
  const { code } = await compile('## Deploy on {1 + 1}\n\nAstro.\n');
  const page = (await new AsyncFunction('opts', code)(scope)) as {
    toc: { url: string }[];
    structuredData: StructuredData;
    _markdown: string;
  };
  // IDs are slugged from the source, like the TOC
  expect(code).not.toContain('_headingIds');
  expect(page.toc.map((item) => item.url)).toEqual(['#deploy-on-']);
  // expressions keep their source in text, and render in the titles of the TOC as before
  expect(page.structuredData.headings[0].content).toBe('Deploy on {1 + 1}');
  expect(page._markdown).toBe('## Deploy on {1 + 1} [#deploy-on-]\n\nAstro.\n');

  // the source decides whether outputs read the props, a static output fails on branches that only props tell apart
  await expect(compile('<show when={props.a}>\n## Astro\n</show>\n')).rejects.toThrow(
    'the outputs of this document are static',
  );
});

test('components in authored code resolve like in the content', async () => {
  const options = await applySatteriPreset({
    data: { unstable_runtimeOutputs: true },
    mdastPlugins: [remarkLlms()],
  })('runtime');
  const { code } = await compileMdx({
    source:
      'export function Local() {\n  return null;\n}\n\n<Card icon={<Icon />} title="Core" />\n\nA value: {<Badge />} and <Local />.\n',
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  const page = (await new AsyncFunction('opts', code)(scope)) as {
    structuredData: StructuredRecords;
    _markdown: FC<object>;
  };
  // components that the module doesn't declare are MDX components, missing ones are kept as JSX syntax
  expect((await renderStructuredData(page.structuredData, {})).contents).toEqual([
    { heading: undefined, content: '<Card title="Core" />' },
    { heading: undefined, content: 'A value: <Badge /> and <Local />.' },
  ]);
  await expect(server.renderToMarkdown(createElement(page._markdown))).resolves.toBe(
    '<Card title="Core" />\n\nA value: <Badge /> and <Local />.',
  );
});

test('Remark Show: branches with included files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'remark-show-'));
  await fs.writeFile(path.join(dir, 'shared.mdx'), '## Shared\n\nShared text.\n');
  await fs.writeFile(
    path.join(dir, 'branchy.mdx'),
    '## Inner\n\n<show when={props.edition === "pro"}>\nIncluded branch.\n</show>\n',
  );
  const options = await applySatteriPreset({ data: { unstable_runtimeOutputs: true } })('runtime');
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
  const page = (await new AsyncFunction('opts', code)(scope)) as {
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
  const options = await applySatteriPreset({ data: { unstable_runtimeOutputs: true } })('runtime');
  const { code } = await compileMdx({
    source: '# Page\n\n<include>./branchy.mdx</include>\n',
    filePath: path.join(dir, 'page.mdx'),
    environment: 'runtime',
    options: {
      ...options,
      mdastPlugins: [remarkInclude({ cwd: dir }), ...options.mdastPlugins!, remarkLlms()],
    },
  });
  const page = (await new AsyncFunction('opts', code)(scope)) as {
    _markdown: FC<object>;
  };
  const markdown = (props: object) => server.renderToMarkdown(createElement(page._markdown, props));
  expect(await markdown({})).not.toContain('Included branch.');
  expect(await markdown({ edition: 'pro' })).toContain('Included branch.');
  await fs.rm(dir, { recursive: true });
});

test('Remark Heading: headings with IDs from code stay headings for other plugins', async () => {
  const { remarkSteps } = await import('@/remark-steps');
  const options = await applySatteriPreset({
    data: { unstable_runtimeOutputs: true },
    mdastPlugins: [remarkSteps()],
  })('runtime');
  const { code } = await compileMdx({
    source:
      '### Install [step]\n\nA\n\n### Use {props.name} <Badge>new</Badge> [step]\n\nB\n\n### Deploy [step]\n',
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options,
  });
  const page = (await new AsyncFunction('opts', code)(scope)) as {
    default: FC<Record<string, unknown>>;
    toc: (props: object) => { url: string; _step?: number; title: ReactNode }[];
  };
  const components = {
    Badge: (props: { children?: ReactNode }) => createElement('b', props),
    // headings are MDX components like before
    h3: (props: object) => createElement('h4', props),
  };

  expect(renderToStaticMarkup(createElement(page.default, { name: 'X', components }))).toBe(
    '<div class="fd-steps"><div class="fd-step"><h4 id="install-step" data-fd-step="1">Install</h4><p>A</p></div><div class="fd-step"><h4 id="use-x-new-step" data-fd-step="2">Use X <b>new</b></h4><p>B</p></div><div class="fd-step"><h4 id="deploy-step" data-fd-step="3">Deploy</h4></div></div>',
  );
  const titles = (props: object) =>
    page.toc(props).map((item) => [item.url, item._step, renderToStaticMarkup(item.title)]);
  expect(titles({ name: 'X', components })).toEqual([
    ['#install-step', 1, 'Install'],
    ['#use-x-new-step', 2, 'Use X <b>new</b>'],
    ['#deploy-step', 3, 'Deploy'],
  ]);
  // without the MDX components, a component of a title is its content
  expect(titles({ name: 'X' })[1][2]).toBe('Use X new');
});
