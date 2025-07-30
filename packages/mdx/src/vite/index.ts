import type { Plugin, TransformResult } from 'vite';
import { buildConfig } from '@/config/build';
import { buildMDX } from '@/utils/build-mdx';
import { parse } from 'node:querystring';
import { countLines } from '@/utils/count-lines';
import { fumaMatter } from '@/utils/fuma-matter';
import { validate, ValidationError } from '@/utils/schema';
import { z } from 'zod';
import { ident, toImportPath } from '@/utils/import-formatter';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { load } from 'js-yaml';
import type { SourceMap, TransformPluginContext } from 'rollup';
import { generateGlob } from '@/vite/generate-glob';
import { getGitTimestamp } from '@/utils/git-timestamp';

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
  const loaded = buildConfig(config);

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

  async function transformContent(
    this: TransformPluginContext,
    file: string,
    query: string,
    value: string,
  ): Promise<TransformResult | null> {
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
      matter.data = await validate(
        schema,
        matter.data,
        {
          source: value,
          path: file,
        },
        `invalid frontmatter in ${file}`,
      );
    }

    if (only === 'frontmatter') {
      return {
        code: `export const frontmatter = ${JSON.stringify(matter.data)}`,
        map: null,
      };
    }

    const data: Record<string, unknown> = {};
    if (loaded.global.lastModifiedTime === 'git') {
      data.lastModified = (await getGitTimestamp(file))?.getTime();
    }

    mdxOptions ??= await loaded.getDefaultMDXOptions();

    // ensure the line number is correct in dev mode
    const lineOffset = isDevelopment ? countLines(matter.matter) : 0;

    const compiled = await buildMDX(
      parsed.collection ?? 'global',
      '\n'.repeat(lineOffset) + matter.content,
      {
        development: isDevelopment,
        ...mdxOptions,
        data,
        filePath: file,
        frontmatter: matter.data as Record<string, unknown>,
        _compiler: {
          addDependency: (file) => {
            this.addWatchFile(file);
          },
        },
      },
    );

    return {
      code: String(compiled.value),
      map: compiled.map as SourceMap,
    };
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

      function docs(name: string, collection: DocsCollection) {
        const args = [
          ident(`doc: ${generateGlob(name, collection.docs)}`),
          ident(`meta: ${generateGlob(name, collection.meta)}`),
        ].join(',\n');

        return `export const ${name} = create.docs("${name}", {\n${args}\n});`;
      }

      function doc(name: string, collection: DocCollection) {
        return `export const ${name} = create.doc("${name}", ${generateGlob(name, collection)});`;
      }

      function meta(name: string, collection: MetaCollection) {
        return `export const ${name} = create.meta("${name}", ${generateGlob(name, collection)});`;
      }

      for (const [name, collection] of loaded.collections.entries()) {
        lines.push('');
        if (collection.type === 'docs') {
          lines.push(docs(name, collection));
        } else if (collection.type === 'meta') {
          lines.push(meta(name, collection));
        } else {
          lines.push(doc(name, collection));
        }
      }

      await fs.writeFile(path.join(outdir, outFile), lines.join('\n'));
    },

    async transform(value, id) {
      const [file, query = ''] = id.split('?');
      const ext = path.extname(file);

      try {
        if (['.yaml', '.json'].includes(ext))
          return await transformMeta(file, query, value);

        if (['.md', '.mdx'].includes(ext))
          return await transformContent.call(this, file, query, value);
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new Error(e.toStringFormatted());
        }

        throw e;
      }
    },
  };
}
