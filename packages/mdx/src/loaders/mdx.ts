import { fumaMatter } from '@/utils/fuma-matter';
import { validate } from '@/utils/validation';
import { getGitTimestamp } from '@/utils/git-timestamp';
import { countLines } from '@/utils/count-lines';
import { buildMDX } from '@/utils/build-mdx';
import type { SourceMap } from 'rollup';
import type { Loader } from '@/loaders/adapter';
import { z } from 'zod';
import type { ConfigLoader } from '@/loaders/config-loader';

const querySchema = z
  .object({
    only: z.literal(['frontmatter', 'all']).default('all'),
    collection: z.string().optional(),
    hash: z
      .string()
      .describe(
        'the hash of config, used for revalidation on Turbopack/Webpack.',
      )
      .optional(),
  })
  .loose();

export function createMdxLoader(configLoader: ConfigLoader): Loader {
  return async ({
    source: value,
    development: isDevelopment,
    query,
    compiler,
    filePath,
  }) => {
    const matter = fumaMatter(value);
    const parsed = querySchema.parse(query);

    const loaded = await configLoader.getConfig(parsed.hash);
    const collection = parsed.collection
      ? loaded.collections.get(parsed.collection)
      : undefined;

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
          path: filePath,
        },
        `invalid frontmatter in ${filePath}`,
      );
    }

    if (parsed.only === 'frontmatter') {
      return {
        code: `export const frontmatter = ${JSON.stringify(matter.data)}`,
        map: null,
      };
    }

    const data: Record<string, unknown> = {};
    if (loaded.global.lastModifiedTime === 'git') {
      data.lastModified = (await getGitTimestamp(filePath))?.getTime();
    }

    // ensure the line number is correct in dev mode
    const lineOffset = isDevelopment ? countLines(matter.matter) : 0;

    const compiled = await buildMDX(
      `${parsed.hash ?? ''}:${parsed.collection ?? 'global'}`,
      '\n'.repeat(lineOffset) + matter.content,
      {
        development: isDevelopment,
        ...(mdxOptions ?? (await loaded.getDefaultMDXOptions())),
        data,
        filePath,
        frontmatter: matter.data as Record<string, unknown>,
        _compiler: compiler,
      },
    );

    return {
      code: String(compiled.value),
      map: compiled.map as SourceMap,
    };
  };
}
