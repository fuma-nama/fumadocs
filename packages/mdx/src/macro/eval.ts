import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { MacroModuleId, parseMacroId, transformMacroConfigModule } from './transform';
import { buildCollection, type CollectionItem } from '@/config/build';
import { defineDocs, type AnyCollection } from '@/config/define';
import { slash } from '@/utils/codegen';

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

export interface MacroCollectorOptions {
  root: string;
  outDir: string;
  isDev: boolean;

  evaluator: MacroEvaluator;
}

interface MacroRegistration {
  fn: 'defineDocs' | 'defineCollections';
  options: Record<string, unknown> | undefined;
}

interface MacroModule {
  /**
   * collections declared by the module, keyed by macro id
   */
  collections: Map<string, CollectionItem>;

  /**
   * absolute paths of modules involved in the evaluation
   */
  inputs: string[];

  stamp: string;
}

export interface ResolvedMacroCollection {
  collection: CollectionItem;

  /**
   * absolute paths of modules involved, add them as dependencies for invalidation
   */
  inputs: string[];
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
export function createNodeEvaluator(env: { root: string; outDir: string }): MacroEvaluator {
  return async ({ entry, transform }) => {
    const { build } = await import('esbuild');
    const outfile = path.join(
      env.outDir,
      'macro',
      `${slash(path.relative(env.root, entry)).replace(/[^a-zA-Z0-9_-]/g, '_')}-${randomUUID()}.mjs`,
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

    try {
      await import(pathToFileURL(outfile).href);
    } finally {
      await fs.rm(outfile, { force: true });
    }

    return {
      inputs: Object.keys(result.metafile.inputs).map((file) => path.resolve(file)),
    };
  };
}

/**
 * Collects macro collections declared across the app, keyed by macro id
 * (`<module path relative to root>#<variable name>`).
 *
 * Content files reference their collection by macro id alone: resolving an unknown id evaluates
 * the module it points at — like `source.config.ts`, but discovered from macro call sites — and
 * registers every collection the module declares.
 */
export class MacroCollector {
  readonly root: string;
  readonly outDir: string;
  readonly isDev: boolean;

  private readonly evaluator: MacroEvaluator;

  /**
   * evaluated modules keyed by absolute path
   */
  private readonly modules = new Map<string, Promise<MacroModule>>();
  private readonly stampChecks = new Map<string, Promise<string>>();

  constructor({ root, outDir, isDev, evaluator }: MacroCollectorOptions) {
    this.root = root;
    this.outDir = outDir;
    this.isDev = isDev;
    this.evaluator = evaluator;
  }

  /**
   * Resolve a macro collection from the `macro_id` query of a content file.
   */
  async resolve(id: string): Promise<ResolvedMacroCollection> {
    const parsed = parseMacroId(id);
    if (!parsed) {
      throw new Error(`[MDX] invalid macro id "${id}".`);
    }

    const { cfg, name } = parsed;
    const abs = path.resolve(this.root, cfg);
    if (path.isAbsolute(cfg) || slash(path.relative(this.root, abs)).startsWith('..')) {
      throw new Error(`[MDX] macro id "${id}" points outside of the project root.`);
    }

    const mod = await this.load(abs);
    const collection = mod.collections.get(id);
    if (!collection) {
      throw new Error(
        `[MDX] cannot find macro collection \`${name}\` in "${cfg}", make sure it is declared as a top-level \`const\`.`,
      );
    }

    return { collection, inputs: mod.inputs };
  }

  private async load(abs: string): Promise<MacroModule> {
    const cached = this.modules.get(abs);

    if (cached) {
      if (!this.isDev) return await cached;

      const prev = await cached.catch(() => undefined);
      if (prev && (await this.stamp(abs, prev.inputs)) === prev.stamp) return prev;

      // stale. another resolve may have replaced the entry while we awaited above — reuse its
      // evaluation instead of starting a second one.
      if (this.modules.get(abs) !== cached) return await this.load(abs);
    }

    // the cache is replaced synchronously below, so concurrent resolves that saw the same stale
    // entry observe this evaluation rather than each starting their own.
    const result = this.evaluate(abs);
    this.modules.set(abs, result);
    result.catch(() => {
      if (this.modules.get(abs) === result) this.modules.delete(abs);
    });

    return await result;
  }

  private async computeStamp(inputs: string[]): Promise<string> {
    if (!this.isDev) return 'static';

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

  /**
   * Concurrent resolves of the same module share one `stat` pass: a rebuild loads many content
   * files at once, and each would otherwise re-stat the module's entire graph.
   */
  private stamp(abs: string, inputs: string[]): Promise<string> {
    const inFlight = this.stampChecks.get(abs);
    if (inFlight) return inFlight;

    const check = this.computeStamp(inputs).finally(() => {
      if (this.stampChecks.get(abs) === check) this.stampChecks.delete(abs);
    });
    this.stampChecks.set(abs, check);
    return check;
  }

  private async evaluate(abs: string): Promise<MacroModule> {
    const registerKey = `fumadocs-mdx:macro:${randomUUID()}`;
    const key = Symbol.for(registerKey);
    const registrations = new Map<string, MacroRegistration>();

    (globalThis as Record<symbol, unknown>)[key] = (
      id: string,
      fn: MacroRegistration['fn'],
      options: MacroRegistration['options'],
    ) => {
      registrations.set(id, { fn, options });
      return {};
    };

    let inputs: string[];
    try {
      inputs = (
        await this.evaluator({
          entry: abs,
          transform: async (code, file) => {
            if (!code.includes(MacroModuleId)) return null;

            return transformMacroConfigModule({
              code,
              file,
              cfg: slash(path.relative(this.root, file)),
              registerKey,
            });
          },
        })
      ).inputs;
    } finally {
      delete (globalThis as Record<symbol, unknown>)[key];
    }

    const collections = new Map<string, CollectionItem>();
    for (const [id, def] of registrations) {
      const collection =
        def.fn === 'defineDocs'
          ? defineDocs((def.options ?? {}) as never)
          : (def.options as unknown as AnyCollection);

      collections.set(id, buildCollection(id, collection as AnyCollection, this.root));
    }

    return {
      collections,
      inputs,
      stamp: await this.computeStamp(inputs),
    };
  }
}
