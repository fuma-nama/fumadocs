import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import * as JsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkInclude } from '@/remark-include';
import { remarkLlms } from '@/remark-llms';
import type { RehypeTocItemType } from '@/rehype-toc';

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;

const source = `# Deploy on {props.framework}

<Note title={props.framework} {...props.extra}>
Hi {props.framework}
</Note>

<show when={props.framework === "astro"}>
## Setup
</show>

<show when={props.framework === "astro" && props.pm === "pnpm"}>
## With pnpm
</show>
`;

async function compile(framework: string) {
  const options = await applySatteriPreset({
    rehypeTocOptions: { exportToc: { as: 'data' } },
    mdastPlugins: [remarkLlms({ as: 'markdown' })],
  })('runtime');
  const { code, data } = await compileMdx({
    source,
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options: { ...options, data: { ...options.data, params: { framework } } },
  });
  const out = (await new AsyncFunction('opts', code)({ ...JsxRuntime })) as { default: () => null };
  const Note = ({ title, children }: { title: string; children: unknown }) =>
    JsxRuntime.jsx('aside', { title, children: children as never });
  const html = (props: object) =>
    renderToStaticMarkup(JsxRuntime.jsx(out.default, { ...props, components: { Note } }));
  return { html, data };
}

test('Remark Show: branches decided at compile time, before other plugins', async () => {
  const waku = await compile('waku');
  const astro = await compile('astro');

  // heading IDs are assigned after the branches of other params are gone
  const urls = (data: typeof waku.data) =>
    (data.rehypeToc as RehypeTocItemType[]).map((item) => item.url);
  expect(urls(waku.data)).toEqual(['#deploy-on-waku']);
  expect(urls(astro.data)).toEqual(['#deploy-on-astro', '#setup', '#with-pnpm']);
  expect((waku.data.structuredData as StructuredData).contents[0].content).toBe('Hi waku');
  expect(astro.data.markdown).toContain('## Setup [#setup]');
  // a removed branch leaves no blank lines
  expect(waku.data.markdown).not.toMatch(/\n{3,}/);
  // other expressions and the branches checked when rendering stay as authored
  expect(waku.data.markdown).toContain(
    '<Note title={props.framework} {...props.extra}>\nHi waku\n</Note>',
  );
  expect(astro.data.markdown).toContain(
    '<show when={props.framework === "astro" && props.pm === "pnpm"}>',
  );

  // they read the params as props when rendering
  expect(astro.html({ framework: 'astro' })).toContain('<aside title="astro">');
  expect(astro.html({ framework: 'astro' })).not.toContain('With pnpm');
  expect(astro.html({ framework: 'astro', pm: 'pnpm' })).toContain('With pnpm');
});

test('Remark Show: the content of a branch joins the content around it', async () => {
  const options = await applySatteriPreset({})('runtime');
  const { code } = await compileMdx({
    source:
      '```ts tab="Shared"\na\n```\n\n<show when={props.framework === "astro"}>\n```ts tab="Astro"\nb\n```\n</show>\n',
    filePath: '/tmp/doc.mdx',
    environment: 'runtime',
    options: { ...options, data: { ...options.data, params: { framework: 'astro' } } },
  });
  // one tab group, across the branch
  expect(code.match(/defaultValue:/g)).toHaveLength(1);
});

test('Remark Show: branches with included files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'remark-show-'));
  await fs.writeFile(path.join(dir, 'shared.mdx'), '## Shared\n\nShared text.\n');
  await fs.writeFile(
    path.join(dir, 'branchy.mdx'),
    '## Inner\n\n<show when={props.framework === "waku"}>\nIncluded branch.\n</show>\n',
  );
  const options = await applySatteriPreset({})('bundler');
  const compile = async (framework: string) => {
    const { data } = await compileMdx({
      source:
        '# Page\n\n<show when={props.framework === "waku"}>\nWaku.\n\n<include>./shared.mdx</include>\n</show>\n\n<include>./branchy.mdx</include>\n\nEnd.\n',
      filePath: path.join(dir, 'page.mdx'),
      environment: 'bundler',
      options: {
        ...options,
        mdastPlugins: [
          remarkInclude({ cwd: dir }),
          ...options.mdastPlugins!,
          remarkLlms({ as: 'markdown' }),
        ],
        data: { ...options.data, params: { framework } },
      },
    });
    return data.markdown;
  };

  expect(await compile('waku')).toBe(
    '# Page [#page]\n\nWaku.\n\n## Shared [#shared]\n\nShared text.\n\n## Inner [#inner]\n\nIncluded branch.\n\nEnd.\n',
  );
  expect(await compile('next')).toBe('# Page [#page]\n\n## Inner [#inner]\n\nEnd.\n');
  await fs.rm(dir, { recursive: true });
});
