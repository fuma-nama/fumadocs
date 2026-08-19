import { describe, expect, test } from 'vitest';
import type { MdastPluginInput } from 'satteri';
import { compileMdx, type ExtraPluginHooks } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkLlms } from '@/remark-llms';
import * as JsxRuntime from 'react/jsx-runtime';

const source = '# Heading\n\nSome text.\n';
const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;

async function compile(
  environment: 'bundler' | 'runtime',
  extra?: Parameters<typeof compileMdx>[0]['options'],
) {
  const options = await applySatteriPreset({
    valueToExport: ['structuredData'],
    mdastPlugins: [remarkLlms({ as: 'markdown' })],
    ...extra,
  })(environment);

  return compileMdx({
    source,
    filePath: '/tmp/doc.mdx',
    frontmatter: { title: 'Doc' },
    environment,
    options,
  });
}

describe('output-format aware exports', () => {
  test('program output carries the values as ESM exports', async () => {
    const { code } = await compile('bundler');

    expect(code).toContain('export const frontmatter =');
    expect(code).toContain('export const structuredData =');
    expect(code).toContain('export const markdown =');
  });

  test('function-body output carries the same values on the returned object', async () => {
    const { code, data } = await compile('runtime');

    // an `export`/`import` after the trailing `return` is a syntax error
    expect(code).not.toMatch(/^\s*export /m);
    expect(code).not.toMatch(/^\s*import /m);

    const fn = new AsyncFunction('opts', code);
    const out = (await fn({ ...JsxRuntime })) as {
      default: unknown;
      frontmatter: unknown;
      structuredData: { headings: unknown[] };
      markdown: string;
      toc: unknown[];
    };
    expect(out.default).toBeTypeOf('function');

    // `fd-exports` injects these into the tree, so the compiler returns them
    expect(out.frontmatter).toEqual({ title: 'Doc' });
    expect(out.structuredData.headings).toHaveLength(1);
    expect(out.markdown).toContain('Heading');
    expect(out.toc).toHaveLength(1);

    // and they remain readable from `data`
    expect(data.structuredData?.headings).toHaveLength(1);
  });

  test('a document with no headings exports an empty toc in both formats', async () => {
    const source = 'Just a paragraph.\n';

    const program = await compileMdx({
      source,
      filePath: '/tmp/plain.md',
      environment: 'bundler',
      options: await applySatteriPreset({})('bundler'),
    });
    expect(program.code).toContain('export const toc = []');

    const runtime = await compileMdx({
      source,
      filePath: '/tmp/plain.md',
      environment: 'runtime',
      options: await applySatteriPreset({})('runtime'),
    });
    const fn = new AsyncFunction('opts', runtime.code);
    const out = (await fn({ ...JsxRuntime })) as { toc?: unknown[] };
    expect(out.toc).toEqual([]);
  });

  test('collectExports hooks contribute, a later export of the same name wins', async () => {
    const declare = (name: string, value: string): MdastPluginInput & ExtraPluginHooks => ({
      name,
      collectExports: ({ addExport }) => addExport('dup', value),
    });

    for (const format of ['md', 'mdx'] as const) {
      const { code } = await compileMdx({
        source,
        filePath: `/tmp/doc.${format}`,
        environment: 'bundler',
        options: {
          mdastPlugins: [declare('first', '"first"'), declare('second', '"second"')],
        },
      });

      expect(code).toContain('export const dup = "second"');
      expect(code).not.toContain('"first"');
      // declared once, as a single ESM node
      expect(code.match(/const dup =/g)).toHaveLength(1);
    }
  });

  test('an empty document still compiles and exports', async () => {
    const { code } = await compileMdx({
      source: '',
      filePath: '/tmp/empty.md',
      frontmatter: { title: 'Empty' },
      environment: 'runtime',
      options: await applySatteriPreset({})('runtime'),
    });

    const fn = new AsyncFunction('opts', code);
    const out = (await fn({ ...JsxRuntime })) as { toc?: unknown[]; frontmatter?: unknown };
    expect(out.toc).toEqual([]);
    expect(out.frontmatter).toEqual({ title: 'Empty' });
  });
});
