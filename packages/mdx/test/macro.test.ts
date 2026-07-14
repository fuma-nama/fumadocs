import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { afterAll, describe, expect, expectTypeOf, test } from 'vitest';
import { transformMacroModule, MacroTransformError } from '@/macro/transform';
import { resolveMacroCollection, type MacroContext } from '@/macro/eval';
import { docs as macroDocs } from '@/runtime/macro';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import type * as fixture from './fixtures/macro/source';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(baseDir, '..');
const sourceFile = path.join(baseDir, 'fixtures/macro/source.ts');
const outDir = path.join(baseDir, 'fixtures/macro/.out');

afterAll(async () => {
  await fs.rm(outDir, { recursive: true, force: true });
});

describe('transform', () => {
  test('vite target', async () => {
    const result = await transformMacroModule({
      code: await fs.readFile(sourceFile, 'utf-8'),
      file: sourceFile,
      root,
      target: 'vite',
    });

    expect(result).not.toBeNull();
    expect(result!.dirs).toEqual([
      path.join(root, 'test/fixtures/generate-index-docs'),
      path.join(root, 'test/fixtures/generate-index'),
      path.join(root, 'test/fixtures/generate-index'),
    ]);
    await expect(result!.code).toMatchFileSnapshot('./fixtures/macro-vite.output.ts');
  });

  test('import target', async () => {
    const result = await transformMacroModule({
      code: await fs.readFile(sourceFile, 'utf-8'),
      file: sourceFile,
      root,
      target: 'import',
    });

    expect(result).not.toBeNull();
    await expect(result!.code).toMatchFileSnapshot('./fixtures/macro-import.output.ts');
  });

  test('ignore modules without macros', async () => {
    await expect(
      transformMacroModule({
        code: `export const test = 'hello world';`,
        file: sourceFile,
        root,
        target: 'vite',
      }),
    ).resolves.toBeNull();
  });

  test('reject non-static options', async () => {
    await expect(() =>
      transformMacroModule({
        code: `import { defineDocs } from 'fumadocs-mdx/macro';
const dir = 'content/docs';
export const docs = defineDocs({ dir });`,
        file: sourceFile,
        root,
        target: 'vite',
      }),
    ).rejects.toThrowError(MacroTransformError);
  });

  test('reject non-top-level calls', async () => {
    await expect(() =>
      transformMacroModule({
        code: `import { defineDocs } from 'fumadocs-mdx/macro';
export function create() {
  return defineDocs({ dir: 'content/docs' });
}`,
        file: sourceFile,
        root,
        target: 'vite',
      }),
    ).rejects.toThrowError(MacroTransformError);
  });
});

describe('config evaluation', () => {
  const ctx: MacroContext = { root, outDir, isDev: false };
  const cfg = 'test/fixtures/macro/source.ts';

  test('defineDocs collection', async () => {
    const { collection, inputs } = await resolveMacroCollection(ctx, cfg, 0);

    expect(inputs).toContain(sourceFile);
    expect(collection.type).toBe('docs');
    if (collection.type !== 'docs') return;

    expect(collection.dir).toBe(path.join(root, 'test/fixtures/generate-index-docs'));
    expect(collection.docs.mdxOptions).toBeDefined();
    expect(collection.docs.schema).toHaveProperty('~standard');
  });

  test('defineCollections (doc)', async () => {
    const { collection } = await resolveMacroCollection(ctx, cfg, 1);

    expect(collection.type).toBe('doc');
    if (collection.type !== 'doc') return;

    expect(collection.async).toBe(true);
    expect(collection.postprocess?.extractLinkReferences).toBe(true);
  });

  test('defineCollections (meta)', async () => {
    const { collection } = await resolveMacroCollection(ctx, cfg, 2);

    expect(collection.type).toBe('meta');
  });

  test('reject module paths outside of root', async () => {
    await expect(() => resolveMacroCollection(ctx, '../outside/source.ts', 0)).rejects.toThrowError(
      /invalid macro module path/,
    );
  });

  test('with the native Vite evaluator', async () => {
    const { createMacroEvaluator } = await import('@/vite');
    const viteCtx: MacroContext = { ...ctx, evaluator: createMacroEvaluator(root) };
    const viteCfg = 'test/fixtures/macro/vite.ts';

    const { collection, inputs } = await resolveMacroCollection(viteCtx, viteCfg, 0);

    expect(inputs).toContain(path.join(root, viteCfg));
    expect(collection.type).toBe('doc');
    if (collection.type !== 'doc') return;

    expect(collection.postprocess?.extractLinkReferences).toBe(true);
  });

  test('compile mdx with macro collection options', async () => {
    const core = createCore({
      environment: 'vite',
      configPath: path.join(root, 'source.config.ts'),
      outDir,
    });
    await core.init({ config: buildConfig({}, root) });

    const loader = createMdxLoader({ getCore: async () => core }, ctx);
    const filePath = path.join(root, 'test/fixtures/generate-index-docs/index.mdx');
    const dependencies: string[] = [];

    const result = await loader.load({
      filePath,
      query: { cfg, id: '0', collection: 'docs', only: 'frontmatter' },
      getSource: () => fs.readFile(filePath, 'utf-8'),
      development: false,
      compiler: {
        addDependency: (file) => dependencies.push(file),
      },
    });

    // schema default from the macro module is applied at compile time
    expect(result?.code).toContain('Hello World');
    expect(dependencies).toContain(sourceFile);
  });
});

describe('types', () => {
  test('macro results are typed', () => {
    expectTypeOf<typeof fixture.docs>().not.toBeNever();
    expectTypeOf<ReturnType<typeof fixture.docs.getPage>>().toMatchTypeOf<
      { title: string } | undefined
    >();

    // async doc collection exposes lazy entries, with `postprocess` passthroughs typed
    expectTypeOf<typeof fixture.blog>().not.toBeNever();
    const entry = {} as NonNullable<ReturnType<typeof fixture.blog.get>>;
    expectTypeOf(entry.load).returns.resolves.toMatchTypeOf<{
      extractedReferences: ExtractedReference[];
    }>();

    expectTypeOf<typeof fixture.metaOnly>().not.toBeNever();
    expectTypeOf<ReturnType<typeof fixture.metaOnly.get>>().toMatchTypeOf<
      { pages?: string[] } | undefined
    >();
  });
});

describe('runtime', () => {
  test('docs collection handle', async () => {
    const collection = await macroDocs({
      base: 'content/docs',
      entries: {
        './index.mdx': {
          default: () => null,
          toc: [],
          structuredData: { headings: [], contents: [] },
          frontmatter: { title: 'Hello' },
        },
      },
      meta: {
        'meta.json': { pages: ['index'] },
      },
    });

    expect(collection.docs).toHaveLength(1);
    expect(collection.getPage('index.mdx')).toMatchObject({ title: 'Hello' });
    expect(collection.getPage('missing.mdx')).toBeUndefined();
    expect(collection.getMeta('meta.json')).toMatchObject({ pages: ['index'] });

    const source = collection.toFumadocsSource();
    expect(source.files).toHaveLength(2);
  });
});
