import { buildConfig } from '@/config/build';
import { CoreOptions, createCore } from '@/core';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import { toVite } from '@/loaders/adapter';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMdxLoader } from '@/loaders/mdx';
import { createMetaLoader } from '@/loaders/meta';
import { createNodeEvaluator, MacroCollector } from '@/macro/eval';
import { slash } from '@/utils/codegen';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RolldownPlugin } from 'rolldown';

export interface PluginOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
  /**
   * Enable the macro API (`fumadocs-mdx/macro`) for matching modules.
   *
   * Patterns (relative to cwd) are passed to the `id` filter of the transform hook directly.
   */
  include?: string | string[];

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
  const include =
    typeof options?.include === 'string' ? [options.include] : (options?.include ?? []);
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

  if (include.length > 0) {
    core.macro = new MacroCollector({
      root,
      outDir: core.outDir,
      isDev: options?.dev ?? false,
      // Rolldown plugins run on Node.js, which cannot evaluate TypeScript natively
      evaluator: createNodeEvaluator({ root, outDir: core.outDir }),
    });
    const { MacroModuleId, transformMacroModule } = await import('@/macro/transform');

    plugins.push({
      name: 'fumadocs-mdx:macro',
      transform: {
        filter: {
          id: {
            include: include.map((pattern) => slash(path.resolve(root, pattern))),
            exclude: ['**/node_modules/**'],
          },
          code: MacroModuleId,
        },
        async handler(code, id) {
          const [file] = id.split('?', 2);
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
