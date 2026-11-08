import { expect, test } from 'vitest';
import * as JsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
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
