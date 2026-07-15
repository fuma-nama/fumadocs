import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, expectTypeOf, test } from 'vitest';
import {
  transformMacroConfigModule,
  transformMacroModule,
  MacroTransformError,
} from '@/macro/transform';
import { createNodeEvaluator, MacroCollector } from '@/macro/eval';
import { createMacroMatcher, MacroModuleId, resolveMacroOptions } from '@/macro/options';
import { macroFilter } from '@/bun';
import { docs as macroDocs } from '@/runtime/macro';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import type * as fixture from './fixtures/macro/source';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(baseDir, '..');
const sourceFile = path.join(baseDir, 'fixtures/macro/source.ts');
const consumerFile = path.join(baseDir, 'fixtures/macro/consumer.ts');
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

  test('config target retains only macro dependencies', async () => {
    const result = await transformMacroConfigModule({
      code: await fs.readFile(consumerFile, 'utf-8'),
      file: consumerFile,
      cfg: path.relative(root, consumerFile),
      registerKey: 'fumadocs-mdx:test',
    });

    expect(result).toContain('function createOptions(');
    expect(result).not.toContain('docs.toFumadocsSource()');
    expect(result).not.toContain('must not run during config evaluation');
    expect(result).not.toContain('fumadocs-mdx/macro');
  });

  test('config target follows resolved symbols through shadowing', async () => {
    const result = await transformMacroConfigModule({
      code: `import { defineDocs } from 'fumadocs-mdx/macro';
function createOptions(defineDocs: () => unknown) {
  defineDocs();
  return {};
}
export const docs = defineDocs({
  docs: { mdxOptions: () => createOptions(() => undefined) },
});`,
      file: sourceFile,
      cfg: path.relative(root, sourceFile),
      registerKey: 'fumadocs-mdx:test',
    });

    expect(result).toContain('function createOptions(');
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

  test('reject calls not assigned to a top-level variable', async () => {
    for (const code of [
      `defineDocs({ dir: 'content/docs' });`,
      `export default defineDocs({ dir: 'content/docs' });`,
    ]) {
      await expect(() =>
        transformMacroModule({
          code: `import { defineDocs } from 'fumadocs-mdx/macro';\n${code}`,
          file: sourceFile,
          root,
          target: 'vite',
        }),
      ).rejects.toThrowError(MacroTransformError);
    }
  });

  test('reject non-const declarations', async () => {
    await expect(() =>
      transformMacroModule({
        code: `import { defineDocs } from 'fumadocs-mdx/macro';
export let docs = defineDocs({ dir: 'content/docs' });`,
        file: sourceFile,
        root,
        target: 'vite',
      }),
    ).rejects.toThrowError(/must be declared with `const`/);
  });

  test('reject destructured collections', async () => {
    await expect(() =>
      transformMacroModule({
        code: `import { defineDocs } from 'fumadocs-mdx/macro';
export const { docs } = defineDocs({ dir: 'content/docs' });`,
        file: sourceFile,
        root,
        target: 'vite',
      }),
    ).rejects.toThrowError(/must be assigned to a plain variable/);
  });
});

describe('options', () => {
  test('enabled by default, covering all JS/TS files but not node_modules', () => {
    const resolved = resolveMacroOptions(undefined);

    expect(resolved).toBeDefined();
    expect(resolved!.include).toEqual([
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '**/*.ts',
      '**/*.tsx',
      '**/*.mts',
    ]);
    expect(resolved!.exclude).toEqual(['**/node_modules/**']);
    // brace-free: not every glob engine these reach expands `{a,b}`
    for (const pattern of resolved!.include) expect(pattern).not.toContain('{');
  });

  test('`macro: false` disables, a string include is normalised', () => {
    expect(resolveMacroOptions(false)).toBeUndefined();
    expect(resolveMacroOptions({})!.include).toHaveLength(6);
    expect(resolveMacroOptions({ include: '**/source.ts' })!.include).toEqual(['**/source.ts']);
  });

  test('webpack/node matcher covers project files but never node_modules', () => {
    const matcher = createMacroMatcher(resolveMacroOptions(undefined)!);

    for (const file of ['lib/source/index.tsx', 'a.js', 'deep/nested/mod.mts']) {
      expect(matcher(file), file).toBe(true);
    }

    // regression: `basename: true` must not reach the exclude patterns, or
    // `**/node_modules/**` stops matching and every dependency is transformed
    for (const file of [
      'node_modules/foo/index.js',
      'packages/a/node_modules/b/index.ts',
      'readme.md',
    ]) {
      expect(matcher(file), file).toBe(false);
    }
  });

  test('slash-less include patterns still match at any depth', () => {
    const matcher = createMacroMatcher(resolveMacroOptions({ include: '*.source.ts' })!);

    expect(matcher('lib/deep/x.source.ts')).toBe(true);
    expect(matcher('node_modules/foo/x.source.ts')).toBe(false);
    expect(matcher('lib/other.ts')).toBe(false);
  });

  test('bun filter matches project files by default and never node_modules', () => {
    const root = '/app';
    const filter = macroFilter(root, resolveMacroOptions(undefined)!);

    for (const file of [
      '/app/lib/source.ts',
      '/app/a.tsx',
      '/app/deep/nested/mod.mjs',
      '/app/src/x.js',
      // the import query used by the bun evaluator must still match
      '/app/lib/source.ts?fd-macro-eval=token',
    ]) {
      expect(filter.test(file), file).toBe(true);
    }

    for (const file of [
      '/app/node_modules/foo/dist/index.js',
      '/app/packages/x/node_modules/foo/index.ts',
      '/app/readme.md',
      '/app/styles.css',
      '/other/lib/source.ts',
    ]) {
      expect(filter.test(file), file).toBe(false);
    }
  });
});

describe('config evaluation', () => {
  const collector = new MacroCollector({
    root,
    outDir,
    isDev: false,
    evaluator: createNodeEvaluator({ root, outDir }),
  });
  const cfg = 'test/fixtures/macro/source.ts';

  test('defineDocs collection', async () => {
    const { collection, inputs } = await collector.resolve(`${cfg}#docs`);

    expect(inputs).toContain(sourceFile);
    expect(collection.type).toBe('docs');
    if (collection.type !== 'docs') return;

    expect(collection.dir).toBe(path.join(root, 'test/fixtures/generate-index-docs'));
    expect(collection.docs.mdxOptions).toBeDefined();
    expect(collection.docs.schema).toHaveProperty('~standard');
  });

  test('defineCollections (doc)', async () => {
    const { collection } = await collector.resolve(`${cfg}#blog`);

    expect(collection.type).toBe('doc');
    if (collection.type !== 'doc') return;

    expect(collection.async).toBe(true);
    expect(collection.postprocess?.extractLinkReferences).toBe(true);
  });

  test('defineCollections (meta)', async () => {
    const { collection } = await collector.resolve(`${cfg}#metaOnly`);

    expect(collection.type).toBe('meta');
  });

  test('does not evaluate consumers of macro results', async () => {
    const { collection } = await collector.resolve('test/fixtures/macro/consumer.ts#docs');

    expect(collection.type).toBe('docs');
    if (collection.type !== 'docs' || typeof collection.docs.mdxOptions !== 'function') return;

    await expect(collection.docs.mdxOptions('bundler')).resolves.toEqual({ rehypePlugins: [] });
  });

  test('isolates parallel Node.js evaluations', async () => {
    const evaluator = createNodeEvaluator({ root, outDir });

    const counts = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const registerKey = `fumadocs-mdx:test:${randomUUID()}`;
        const key = Symbol.for(registerKey);
        let count = 0;

        (globalThis as Record<symbol, unknown>)[key] = (
          _cfg: string,
          _fn: string,
          _options: unknown,
        ) => {
          count++;
          return {};
        };

        try {
          await evaluator({
            entry: consumerFile,
            async transform(code, file) {
              if (!code.includes(MacroModuleId)) return null;

              return transformMacroConfigModule({
                code,
                file,
                cfg: path.relative(root, file),
                registerKey,
              });
            },
          });
        } finally {
          delete (globalThis as Record<symbol, unknown>)[key];
        }

        return count;
      }),
    );

    expect(counts).toEqual(Array(8).fill(1));
  });

  test('evaluates a module once for concurrent resolves, and once per change', async () => {
    const name = `.cache-${randomUUID()}.ts`;
    const file = path.join(baseDir, 'fixtures/macro', name);
    const cfg = `test/fixtures/macro/${name}`;
    const write = (dir: string) =>
      fs.writeFile(
        file,
        `import { defineDocs } from 'fumadocs-mdx/macro';
export const docs = defineDocs({ dir: '${dir}' });
export const other = defineDocs({ dir: '${dir}' });`,
      );

    await write('test/fixtures/generate-index-docs');
    let evaluations = 0;
    const inner = createNodeEvaluator({ root, outDir });
    const dev = new MacroCollector({
      root,
      outDir,
      isDev: true,
      evaluator: (options) => {
        evaluations++;
        return inner(options);
      },
    });

    const resolveAll = () =>
      Promise.all([
        dev.resolve(`${cfg}#docs`),
        dev.resolve(`${cfg}#other`),
        dev.resolve(`${cfg}#docs`),
        dev.resolve(`${cfg}#other`),
      ]);

    try {
      const first = await resolveAll();
      expect(evaluations).toBe(1);
      expect(first[0].collection.dir).toBe(path.join(root, 'test/fixtures/generate-index-docs'));

      // cached: an unchanged module is not re-evaluated
      await resolveAll();
      expect(evaluations).toBe(1);

      await write('test/fixtures/generate-index');
      // guarantee a distinct mtime regardless of filesystem timestamp granularity
      const future = new Date(Date.now() + 10_000);
      await fs.utimes(file, future, future);

      // stale: re-evaluated exactly once, not once per concurrent resolve
      const second = await resolveAll();
      expect(evaluations).toBe(2);
      expect(second[0].collection.dir).toBe(path.join(root, 'test/fixtures/generate-index'));
    } finally {
      await fs.rm(file, { force: true });
    }
  });

  test('reject module paths outside of root', async () => {
    await expect(() => collector.resolve('../outside/source.ts#docs')).rejects.toThrowError(
      /points outside of the project root/,
    );
  });

  test('reject ids without a collection name', async () => {
    await expect(() => collector.resolve(cfg)).rejects.toThrowError(/invalid macro id/);
  });

  test('reject unknown collection names', async () => {
    await expect(() => collector.resolve(`${cfg}#missing`)).rejects.toThrowError(
      /cannot find macro collection `missing`/,
    );
  });

  test('compile mdx with macro collection options', async () => {
    const core = createCore({
      environment: 'vite',
      configPath: path.join(root, 'source.config.ts'),
      outDir,
    });
    await core.init({ config: buildConfig({}, root) });
    core.macro = collector;

    const loader = createMdxLoader({ getCore: async () => core });
    const filePath = path.join(root, 'test/fixtures/generate-index-docs/index.mdx');
    const dependencies: string[] = [];

    const result = await loader.load({
      filePath,
      query: { macro_id: `${cfg}#docs`, only: 'frontmatter' },
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
      extractedReferences?: ExtractedReference[];
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
