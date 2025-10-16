import {
  mergeConfig,
  type Plugin,
  type TransformResult,
  type UserConfig,
} from 'vite';
import { buildConfig } from '@/config/build';
import { parse } from 'node:querystring';
import { validate, ValidationError } from '@/utils/validation';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { load } from 'js-yaml';
import { entry, type IndexFileOptions } from '@/vite/generate';
import { createMdxLoader } from '@/loaders/mdx';
import { resolvedConfig } from '@/loaders/config';
import { toVite } from '@/loaders/adapter';

const FumadocsDeps = ['fumadocs-core', 'fumadocs-ui', 'fumadocs-openapi'];

export interface PluginOptions {
  /**
   * Automatically generate index files for accessing files with `import.meta.glob`.
   *
   * @defaultValue true
   */
  generateIndexFile?: boolean | IndexFileOptions;

  /**
   * @defaultValue source.config.ts
   */
  configPath?: string;

  /**
   * Update Vite config to fix module resolution of Fumadocs
   *
   * @defaultValue true
   */
  updateViteConfig?: boolean;
}

export * from './postinstall';

export default function mdx(
  config: Record<string, unknown>,
  options: PluginOptions = {},
): Plugin {
  const {
    generateIndexFile = true,
    updateViteConfig = true,
    configPath = 'source.config.ts',
  } = options;
  const loaded = buildConfig(config);

  const mdxLoader = toVite(createMdxLoader(resolvedConfig(loaded)));

  async function transformMeta(
    path: string,
    query: string,
    value: string,
  ): Promise<TransformResult | null> {
    const isJson = path.endsWith('.json');
    const parsed = parse(query) as {
      collection?: string;
    };

    const collection = parsed.collection
      ? loaded!.collections.get(parsed.collection)
      : undefined;
    if (!collection) return null;
    let schema;
    switch (collection.type) {
      case 'meta':
        schema = collection.schema;
        break;
      case 'docs':
        schema = collection.meta.schema;
        break;
    }
    if (!schema) return null;

    let data;
    try {
      data = isJson ? JSON.parse(value) : load(value);
    } catch {
      return null;
    }

    const out = await validate(
      schema,
      data,
      { path, source: value },
      `invalid data in ${path}`,
    );

    return {
      code: isJson
        ? JSON.stringify(out)
        : `export default ${JSON.stringify(out)}`,
      map: null,
    };
  }

  return {
    name: 'fumadocs-mdx',
    // needed, otherwise other plugins will be executed before our `transform`.
    enforce: 'pre',
    config(config) {
      if (!updateViteConfig) return config;

      return mergeConfig(config, {
        optimizeDeps: {
          exclude: FumadocsDeps,
        },
        resolve: {
          noExternal: FumadocsDeps,
          dedupe: FumadocsDeps,
        },
      } satisfies UserConfig);
    },
    async buildStart() {
      let indexFileOptions = generateIndexFile;
      if (!indexFileOptions) return;
      if (typeof indexFileOptions !== 'object') indexFileOptions = {};

      const { out = 'source.generated.ts' } = indexFileOptions;

      console.log('[Fumadocs MDX] Generating index files');
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, entry(configPath, loaded, indexFileOptions));
    },

    async transform(value, id) {
      const [file, query = ''] = id.split('?');
      const ext = path.extname(file);

      try {
        if (['.yaml', '.json'].includes(ext))
          return await transformMeta(file, query, value);

        if (['.md', '.mdx'].includes(ext))
          return await mdxLoader.call(this, file, query, value);
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new Error(e.toStringFormatted());
        }

        throw e;
      }
    },
  };
}
