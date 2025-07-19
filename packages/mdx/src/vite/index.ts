import type { Plugin } from 'vite';
import { buildConfig } from '@/config/build';
import { buildMDX } from '@/utils/build-mdx';
import { parse } from 'node:querystring';
import { countLines } from '@/utils/count-lines';
import { fumaMatter } from '@/utils/fuma-matter';
import { validate, ValidationError } from '@/utils/schema';
import { z } from 'zod';

const fileRegex = /\.(md|mdx)$/;

const onlySchema = z.literal(['frontmatter', 'all']);

export default function mdx(config: Record<string, unknown>): Plugin {
  const [err, loaded] = buildConfig(config);
  if (err || !loaded) {
    throw new Error(err);
  }

  return {
    name: 'fumadocs-mdx',
    // needed, otherwise other plugins will be executed before our `transform`.
    enforce: 'pre',
    // TODO: need a way to generate .source folder that works for non-RSC based frameworks, currently, we need to dynamic import MDX files using `import.meta.glob`.
    // at the moment, RR and Tanstack Start has no stable support for RSC yet.

    async transform(value, id) {
      const [path, query = ''] = id.split('?');
      if (!fileRegex.test(path)) return;

      const matter = fumaMatter(value);
      const isDevelopment = this.environment.mode === 'dev';
      const parsed = parse(query) as {
        collection?: string;
        only?: string;
      };

      const collection = parsed.collection
        ? loaded.collections.get(parsed.collection)
        : undefined;
      const only = parsed.only ? onlySchema.parse(parsed.only) : 'all';

      let schema;
      let mdxOptions;
      switch (collection?.type) {
        case 'doc':
          mdxOptions = collection.mdxOptions;
          schema = collection.schema;
          break;
        case 'docs':
          mdxOptions = collection.docs.mdxOptions;
          schema = collection.docs.schema;
          break;
      }

      if (schema) {
        try {
          matter.data = await validate(
            schema,
            matter.data,
            {
              source: value,
              path,
            },
            `invalid frontmatter in ${path}`,
          );
        } catch (e) {
          if (e instanceof ValidationError) {
            throw new Error(e.toStringFormatted());
          }

          throw e;
        }
      }

      if (only === 'frontmatter') {
        return {
          code: `export const frontmatter = ${JSON.stringify(matter.data)}`,
        };
      }

      const { loadDefaultOptions } = await import('@/utils/mdx-options');
      mdxOptions ??= await loadDefaultOptions(loaded);

      // ensure the line number is correct in dev mode
      const lineOffset = isDevelopment ? countLines(matter.matter) : 0;

      const file = await buildMDX(
        parsed.collection ?? 'global',
        '\n'.repeat(lineOffset) + matter.content,
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
        code: String(file.value),
        map: file.map,
      };
    },
  };
}
