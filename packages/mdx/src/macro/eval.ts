import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { MacroModuleId, macroCollectionName, transformMacroConfigModule } from './transform';
import { buildCollection, type CollectionItem } from '@/config/build';
import { defineDocs, type AnyCollection } from '@/config/define';
import { slash } from '@/utils/codegen';

export interface MacroContext {
  root: string;
  outDir: string;
  isDev: boolean;

  /**
   * Evaluate macro modules with the runtime/bundler's native module evaluation
   * (e.g. Vite Runtime API, Bun).
   *
   * When not given, fallback to a Node.js implementation based on esbuild.
   */
  evaluator?: MacroEvaluator;
}

export interface MacroEvaluatorOptions {
  /**
   * absolute path of the entry module
   */
  entry: string;

  /**
   * Apply the config-mode transform on a module of the graph.
   *
   * @returns `null` when it's not a macro module.
   */
  transform: (code: string, file: string) => Promise<string | null>;
}

export type MacroEvaluator = (options: MacroEvaluatorOptions) => Promise<{
  /**
   * absolute paths of evaluated modules, for cache invalidation
   */
  inputs: string[];
}>;

interface MacroRegistration {
  fn: 'defineDocs' | 'defineCollections';
  options: Record<string, unknown> | undefined;
}

interface EvalResult {
  /**
   * collections keyed by module path (relative to root)
   */
  collections: Map<string, CollectionItem[]>;

  /**
   * absolute paths of modules involved in the evaluation
   */
  inputs: string[];
}

const cache = new Map<string, Promise<EvalResult & { stamp: string }>>();

async function getStamp(ctx: MacroContext, inputs: string[]): Promise<string> {
  if (!ctx.isDev) return 'static';

  const stats = await Promise.all(
    inputs.map((file) =>
      fs.stat(file).then(
        (stat) => stat.mtimeMs,
        () => -1,
      ),
    ),
  );
  return stats.join(',');
}

function esbuildLoader(file: string) {
  if (file.endsWith('.tsx')) return 'tsx' as const;
  if (file.endsWith('.jsx')) return 'jsx' as const;
  if (/\.[cm]?ts$/.test(file)) return 'ts' as const;
  return 'js' as const;
}

/**
 * Node.js evaluator: bundle the module graph with esbuild, then import the output.
 *
 * Bundlers/runtimes that can evaluate TypeScript natively should provide their own
 * `evaluator` instead.
 */
function createNodeEvaluator(ctx: MacroContext): MacroEvaluator {
  return async ({ entry, transform }) => {
    const { build } = await import('esbuild');
    const outfile = path.join(
      ctx.outDir,
      'macro',
      `${slash(path.relative(ctx.root, entry)).replace(/[^a-zA-Z0-9_-]/g, '_')}.mjs`,
    );

    const result = await build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      packages: 'external',
      jsx: 'automatic',
      outfile,
      write: true,
      allowOverwrite: true,
      metafile: true,
      logLevel: 'silent',
      plugins: [
        {
          name: 'fumadocs-mdx:macro-config',
          setup(b) {
            b.onLoad({ filter: /\.(?:[cm]?[jt]s|[jt]sx)$/ }, async (args) => {
              const contents = await transform(await fs.readFile(args.path, 'utf-8'), args.path);
              if (contents === null) return;

              return {
                contents,
                loader: esbuildLoader(args.path),
                resolveDir: path.dirname(args.path),
              };
            });
          },
        },
      ],
    });

    const url = pathToFileURL(outfile);
    // always evaluate a fresh module
    url.searchParams.set('hash', Date.now().toString());
    await import(url.href);

    return {
      inputs: Object.keys(result.metafile.inputs).map((file) => path.resolve(file)),
    };
  };
}

/**
 * Evaluate a macro module in the build process to obtain the raw collection options,
 * like `source.config.ts` but discovered from macro call sites.
 */
async function evaluate(ctx: MacroContext, entry: string): Promise<EvalResult & { stamp: string }> {
  const registerKey = `fumadocs-mdx:macro:${randomUUID()}`;
  const registrations = new Map<string, MacroRegistration[]>();

  const key = Symbol.for(registerKey);
  (globalThis as Record<symbol, unknown>)[key] = (
    cfg: string,
    fn: MacroRegistration['fn'],
    options: MacroRegistration['options'],
  ) => {
    let list = registrations.get(cfg);
    if (!list) {
      list = [];
      registrations.set(cfg, list);
    }

    list.push({ fn, options });
    return {};
  };

  let inputs: string[];
  try {
    const evaluator = ctx.evaluator ?? createNodeEvaluator(ctx);

    inputs = (
      await evaluator({
        entry: path.resolve(ctx.root, entry),
        async transform(code, file) {
          if (!code.includes(MacroModuleId)) return null;

          return transformMacroConfigModule({
            code,
            file,
            cfg: slash(path.relative(ctx.root, file)),
            registerKey,
          });
        },
      })
    ).inputs;
  } finally {
    delete (globalThis as Record<symbol, unknown>)[key];
  }

  const collections = new Map<string, CollectionItem[]>();

  for (const [cfg, defs] of registrations) {
    collections.set(
      cfg,
      defs.map((def, i) => {
        const collection =
          def.fn === 'defineDocs'
            ? defineDocs((def.options ?? {}) as never)
            : (def.options as unknown as AnyCollection);

        return buildCollection(macroCollectionName(cfg, i), collection as AnyCollection, ctx.root);
      }),
    );
  }

  return {
    collections,
    inputs,
    stamp: await getStamp(ctx, inputs),
  };
}

async function loadMacroModule(ctx: MacroContext, cfg: string): Promise<EvalResult> {
  const abs = path.resolve(ctx.root, cfg);
  let cached = cache.get(abs);

  if (cached) {
    if (!ctx.isDev) return await cached;

    const prev = await cached.catch(() => undefined);
    if (prev && (await getStamp(ctx, prev.inputs)) === prev.stamp) return prev;
    cached = undefined;
  }

  if (!cached) {
    cached = evaluate(ctx, cfg);
    cache.set(abs, cached);
    cached.catch(() => cache.delete(abs));
  }

  return await cached;
}

export interface ResolvedMacroCollection {
  collection: CollectionItem;

  /**
   * absolute paths of modules involved, add them as dependencies for invalidation
   */
  inputs: string[];
}

/**
 * Resolve a macro collection from the `cfg` & `id` query of a content file.
 */
export async function resolveMacroCollection(
  ctx: MacroContext,
  cfg: string,
  id: number,
): Promise<ResolvedMacroCollection> {
  if (
    path.isAbsolute(cfg) ||
    slash(path.relative(ctx.root, path.resolve(ctx.root, cfg))).startsWith('..')
  ) {
    throw new Error(`[MDX] invalid macro module path "${cfg}".`);
  }

  const result = await loadMacroModule(ctx, cfg);
  const collection = result.collections.get(slash(cfg))?.[id];
  if (!collection) {
    throw new Error(
      `[MDX] cannot find macro collection #${id} in "${cfg}", make sure macros are called at the top level of the module.`,
    );
  }

  return {
    collection,
    inputs: result.inputs,
  };
}
