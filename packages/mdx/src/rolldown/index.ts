import { buildConfig } from '@/config/build';
import { CoreOptions, createCore } from '@/core';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import { toVite } from '@/loaders/adapter';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMdxLoader } from '@/loaders/mdx';
import { createMetaLoader } from '@/loaders/meta';
import { createNodeEvaluator, MacroCollector } from '@/macro/eval';
import { MacroModuleId, resolveMacroOptions, type MacroPluginOption } from '@/macro/options';
import { slash } from '@/utils/codegen';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RolldownPlugin } from 'rolldown';

export interface PluginOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
  /**
   * Configure the macro API (`fumadocs-mdx/macro`), or `false` to disable it.
   *
   * `macro.include` (relative to cwd) is passed to the `id` filter of the transform hook.
   */
  macro?: MacroPluginOption;

  /**
   * Re-evaluate macro modules when they're updated, for long-running processes like watch mode.
   */
  dev?: boolean;
}

export default async function mdx(
  config: Record<string, unknown> | Promise<Record<string, unknown>> = {},
  options?: PluginOptions,
): Promise<RolldownPlugin[]> {
  const root = process.cwd();
  const macroOptions = resolveMacroOptions(options?.macro);
  const core = createCore({
    configPath: options?.configPath,
    outDir: options?.outDir,
    plugins: options?.plugins,
    environment: 'rolldown',
  });
  await core.init({
    config: buildConfig(await config, root),
  });

  const plugins: RolldownPlugin[] = [];

  if (macroOptions) {
    core.macro = new MacroCollector({
      root,
      outDir: core.outDir,
      isDev: options?.dev ?? false,
      // Rolldown plugins run on Node.js, which cannot evaluate TypeScript natively
      evaluator: createNodeEvaluator({ root, outDir: core.outDir }),
    });

    plugins.push({
      name: 'fumadocs-mdx:macro',
      transform: {
        filter: {
          id: {
            include: macroOptions.include.map((pattern) => slash(path.resolve(root, pattern))),
            exclude: macroOptions.exclude,
          },
          code: MacroModuleId,
        },
        async handler(code, id) {
          const [file] = id.split('?', 2);
          const { transformMacroModule } = await import('@/macro/transform');
          const result = await transformMacroModule({
            code,
            file,
            root,
            target: 'import',
          });
          if (!result) return;

          // re-run when content files are added/removed
          for (const dir of result.dirs) this.addWatchFile(dir);

          return {
            code: result.code,
            map: result.map as never,
          };
        },
      },
    });
  }

  const configLoader = createIntegratedConfigLoader(core);
  const mdxLoader = toVite(createMdxLoader(configLoader));
  const metaLoader = toVite(
    createMetaLoader(configLoader, {
      // rolldown has built-in plugin for JSON files
      json: 'json',
    }),
  );

  plugins.push(
    {
      name: 'fumadocs-mdx',
      load: {
        filter: { id: [metaLoaderGlob, mdxLoaderGlob] },
        // Rolldown couldn't read the correct file path when query params exist.
        async handler(id) {
          const idx = id.lastIndexOf('?');
          if (idx === -1) return null;

          return fs.readFile(id.slice(0, idx), 'utf-8');
        },
      },
    },
    {
      name: 'fumadocs-mdx:mdx',
      transform: {
        filter: { id: mdxLoaderGlob },
        handler: mdxLoader.transform,
      },
    },
    {
      name: 'fumadocs-mdx:meta',
      transform: {
        filter: { id: metaLoaderGlob },
        handler: metaLoader.transform,
      },
    },
  );

  return plugins;
}
