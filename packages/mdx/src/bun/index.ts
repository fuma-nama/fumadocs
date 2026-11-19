import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { type CoreOptions, createCore } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { toBun } from '@/loaders/adapter';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import type { MacroEvaluatorOptions } from '@/macro/eval';
import {
  createMacroMatcher,
  MacroModuleId,
  NodeModulesRegex,
  resolveMacroOptions,
  type MacroPluginOption,
} from '@/macro/options';

export interface MdxPluginOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
  /**
   * Configure the macro API (`fumadocs-mdx/macro`), or `false` to disable it.
   */
  macro?: MacroPluginOption;

  /**
   * Skip meta file transformation step
   */
  disableMetaFile?: boolean;
}

const EvalQueryKey = 'fd-macro-eval';

/**
 * JS/TS modules outside of `node_modules`, with an optional import query.
 *
 * @internal
 */
export const macroFilter = new RegExp(
  String.raw`^(?!.*${NodeModulesRegex.source}).*\.(?:[cm]?[jt]s|[jt]sx)(?:\?.*)?$`,
);

function bunLoader(file: string) {
  if (file.endsWith('.tsx')) return 'tsx' as const;
  if (file.endsWith('.jsx')) return 'jsx' as const;
  if (/\.[cm]?ts$/.test(file)) return 'ts' as const;
  return 'js' as const;
}

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const { disableMetaFile = false } = options;
  const macroOptions = resolveMacroOptions(options.macro);

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

      if (macroOptions) {
        const root = process.cwd();
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

        const matcher = createMacroMatcher(root, macroOptions);

        build.onLoad({ filter: macroFilter }, async (args) => {
          const [file, query = ''] = args.path.split('?', 2);
          const loader = bunLoader(file);
          const source = await Bun.file(file).text();
          // runtime plugins of Bun cannot fall through, they must return the contents
          if (!matcher(file) || !source.includes(MacroModuleId))
            return { contents: source, loader };

          const token = new URLSearchParams(query).get(EvalQueryKey);
          const transform = token ? pendingEvals.get(token) : undefined;
          if (transform) {
            return {
              contents: (await transform(source, file)) ?? source,
              loader,
            };
          }

          const { transformMacroModule } = await import('@/macro/transform');
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
