import type { Plugin } from 'vite';
import { buildConfig } from '@/config/build';
import { buildMDX } from '@/utils/build-mdx';
import { parse } from 'node:querystring';
import { countLines } from '@/utils/count-lines';
import { fumaMatter } from '@/utils/fuma-matter';
import { validate, ValidationError } from '@/utils/schema';
import { z } from 'zod';
import { toImportPath } from '@/utils/import-formatter';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'js-yaml';

const fileRegex = /\.(md|mdx)$/;
const onlySchema = z.literal(['frontmatter', 'all']);

export interface PluginOptions {
  /**
   * Automatically generate index files for accessing files with `import.meta.glob`.
   *
   * @defaultValue true
   */
  generateIndexFile?: boolean;

  /**
   * @defaultValue source.config.ts
   */
  configPath?: string;
}

export default function mdx(
  config: Record<string, unknown>,
  options: PluginOptions = {},
): Plugin {
  const { generateIndexFile = true, configPath = 'source.config.ts' } = options;
  const [err, loaded] = buildConfig(config);
  if (err || !loaded) {
    throw new Error(err);
  }

  return {
    name: 'fumadocs-mdx',
    // needed, otherwise other plugins will be executed before our `transform`.
    enforce: 'pre',
    async buildStart() {
      if (!generateIndexFile) return;

      console.log('[Fumadocs MDX] Generating index files');
      const outdir = process.cwd();
      const outFile = 'source.generated.ts';
      const lines = [
        `import { fromConfig } from 'fumadocs-mdx/runtime/vite';`,
        `import type * as Config from '${toImportPath(configPath, {
          relativeTo: outdir,
        })}';`,
        '',
        `export const create = fromConfig<typeof Config>();`,
      ];

      function filesToGlob(files: string[]) {
        return files.map((file) => {
          if (file.startsWith('./')) return file;
          if (file.startsWith('/')) return `.${file}`;

          return `./${file}`;
        });
      }

      function docs(name: string, dir: string, collection: DocsCollection) {
        const docFiles = collection.docs.files
          ? filesToGlob(collection.docs.files)
          : ['./**/*.{mdx,md}'];
        const metaFiles = collection.meta.files
          ? filesToGlob(collection.meta.files)
          : ['./**/*.{yaml,json}'];

        return `export const ${name} = create.docs('${name}', {
  doc: import.meta.glob(${JSON.stringify(docFiles)}, {
    query: {
      collection: '${name}',
    },
    base: '${dir}',
  }),
  meta: import.meta.glob(${JSON.stringify(metaFiles)}, {
    query: {
      collection: '${name}',
    },
    base: '${dir}',
    import: 'default',
  }),
});`;
      }

      function doc(name: string, dir: string, collection: DocCollection) {
        const files = collection.files
          ? filesToGlob(collection.files)
          : ['./**/*.{mdx,md}'];

        return `export const ${name} = create.doc(
  '${name}',
  import.meta.glob(${JSON.stringify(files)}, {
    query: {
      collection: '${name}',
    },
    base: '${dir}',
  }),
);`;
      }

      function meta(name: string, dir: string, collection: MetaCollection) {
        const files = collection.files
          ? filesToGlob(collection.files)
          : ['./**/*.{yaml,json}'];

        return `export const ${name} = create.meta(
  '${name}',
  import.meta.glob(${JSON.stringify(files)}, {
    query: {
      collection: '${name}',
    },
    base: '${dir}',
    import: 'default',
  }),
);`;
      }

      for (const [name, collection] of loaded.collections.entries()) {
        let dir = collection.dir;

        if (Array.isArray(dir) && dir.length === 1) {
          dir = dir[0];
        } else if (Array.isArray(dir)) {
          throw new Error(
            `[Fumadocs MDX] Vite Plugin doesn't support multiple \`dir\` for a collection at the moment.`,
          );
        }
        if (!dir.startsWith('./') && !dir.startsWith('/')) {
          dir = '/' + dir;
        }

        lines.push('');
        if (collection.type === 'docs') {
          lines.push(docs(name, dir, collection));
        } else if (collection.type === 'meta') {
          lines.push(meta(name, dir, collection));
        } else {
          lines.push(doc(name, dir, collection));
        }
      }

      await fs.writeFile(path.join(outdir, outFile), lines.join('\n'));
    },

    async transform(value, id) {
      const [path, query = ''] = id.split('?');
      const isJson = path.endsWith('.json');
      const isYaml = path.endsWith('.yaml');

      if (isJson || isYaml) {
        const parsed = parse(query) as {
          collection?: string;
        };

        const collection = parsed.collection
          ? loaded.collections.get(parsed.collection)
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

      mdxOptions ??= await loaded.getDefaultMDXOptions();

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
