import type { Plugin } from 'vite';
import { buildConfig } from '@/config/build';
import { buildMDX } from '@/utils/build-mdx';
import { parse } from 'node:querystring';
import { countLines } from '@/utils/count-lines';
import { fumaMatter } from '@/utils/fuma-matter';
import { loadDefaultOptions } from '@/utils/mdx-options';

export interface CreateMDXOptions {
  configPath?: string;
}

const fileRegex = /\.(md|mdx)$/;

export default function unstable_mdx(
  config: Record<string, unknown>,
  _options: CreateMDXOptions = {},
): Plugin {
  const [err, loaded] = buildConfig(config);
  if (err || !loaded) {
    throw new Error(err);
  }

  return {
    name: 'fumadocs-mdx',
    // TODO: need a way to generate .source folder that works for non-RSC based frameworks, currently, we need to dynamic import MDX files using `import.meta.glob`.
    // at the moment, RR and Tanstack Start has no stable support for RSC yet.

    async transform(value, id) {
      const [path, query = ''] = id.split('?');
      if (!fileRegex.test(path)) return;

      const matter = fumaMatter(value);
      const isDevelopment = this.environment.mode === 'dev';
      const { collection: collectionId, raw } = parse(query) as {
        collection?: string;
        raw?: string;
      };

      const collection = collectionId
        ? loaded.collections.get(collectionId)
        : undefined;

      // ensure the line number is correct in dev mode
      const lineOffset = '\n'.repeat(
        isDevelopment ? countLines(matter.matter) : 0,
      );

      let mdxOptions;
      switch (collection?.type) {
        case 'doc':
          mdxOptions = collection.mdxOptions;
          break;
        case 'docs':
          mdxOptions = collection.docs.mdxOptions;
          break;
      }

      mdxOptions ??= await loadDefaultOptions(loaded);

      const file = await buildMDX(
        collectionId ?? 'global',
        lineOffset + matter.content,
        {
          development: isDevelopment,
          ...mdxOptions,
          filePath: path,
          frontmatter: matter.data as Record<string, unknown>,
          _compiler: {
            addDependency: (file) => {
              this.addWatchFile(file);
            },
          },
        },
      );

      return {
        code:
          typeof raw === 'string'
            ? `export default ${JSON.stringify(file.value)}`
            : String(file.value),
      };
    },
  };
}
