import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import picomatch from 'picomatch';
import { type CoreOptions, createCore } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { toBun } from '@/loaders/adapter';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import type { MacroEvaluatorOptions } from '@/macro/eval';
import { slash } from '@/utils/codegen';

export interface MdxPluginOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
  /**
   * Enable the macro API (`fumadocs-mdx/macro`) for matching modules.
   *
   * Patterns (relative to cwd) are converted into a RegExp for the `onLoad` filter of Bun plugin.
   */
  include?: string | string[];

  /**
   * Skip meta file transformation step
   */
  disableMetaFile?: boolean;
}

const EvalQueryKey = 'fd-macro-eval';

function bunLoader(file: string) {
  if (file.endsWith('.tsx')) return 'tsx' as const;
  if (file.endsWith('.jsx')) return 'jsx' as const;
  if (/\.[cm]?ts$/.test(file)) return 'ts' as const;
  return 'js' as const;
}

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const { disableMetaFile = false } = options;
  const include = typeof options.include === 'string' ? [options.include] : (options.include ?? []);

  return {
    name: 'bun-plugin-fumadocs-mdx',
    async setup(build) {
      const core = createCore({
        environment: 'bun',
        outDir: options.outDir,
        configPath: options.configPath,
        plugins: options.plugins,
      });

      const importPath = pathToFileURL(core.configPath).href;
      const hasConfig = await fs.access(core.configPath).then(
        () => true,
        () => false,
      );
      const configExports: Record<string, unknown> = hasConfig ? await import(importPath) : {};

      await core.init({
        config: buildConfig(configExports, process.cwd()),
      });

      if (include.length > 0) {
        const root = process.cwd();
        const { MacroModuleId, transformMacroModule } = await import('@/macro/transform');
        const { MacroCollector } = await import('@/macro/eval');
        const pendingEvals = new Map<string, MacroEvaluatorOptions['transform']>();

        core.macro = new MacroCollector({
          root,
          outDir: core.outDir,
          isDev: false,
          async evaluator({ entry, transform }) {
            const token = randomUUID();
            pendingEvals.set(token, transform);

            try {
              await import(`${entry}?${EvalQueryKey}=${token}`);
            } finally {
              pendingEvals.delete(token);
            }

            return { inputs: [entry] };
          },
        });

        // `include` patterns, converted into a RegExp anchored at cwd, with optional import query
        const filter = new RegExp(
          include
            .map((pattern) => {
              const source = picomatch.makeRe(slash(path.resolve(root, pattern)), {
                dot: true,
              }).source;

              return `(?:${source.replace(/\$$/, String.raw`(?:\?.*)?$`)})`;
            })
            .join('|'),
        );

        build.onLoad({ filter }, async (args) => {
          const [file, query = ''] = args.path.split('?', 2);
          const loader = bunLoader(file);
          const source = await Bun.file(file).text();
          if (!source.includes(MacroModuleId)) return { contents: source, loader };

          const token = new URLSearchParams(query).get(EvalQueryKey);
          const transform = token ? pendingEvals.get(token) : undefined;
          if (transform) {
            return {
              contents: (await transform(source, file)) ?? source,
              loader,
            };
          }

          const result = await transformMacroModule({
            code: source,
            file,
            root,
            target: 'import',
          });

          return {
            contents: result?.code ?? source,
            loader,
          };
        });
      }

      const configLoader = createIntegratedConfigLoader(core);
      toBun(mdxLoaderGlob, createMdxLoader(configLoader))(build);
      if (!disableMetaFile) toBun(metaLoaderGlob, createMetaLoader(configLoader, {}))(build);
    },
  };
}
