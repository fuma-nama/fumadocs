import type { Loader, LoaderInput } from '@/loaders/adapter';
import type { ConfigLoader } from '@/loaders/config';
import { dump, load } from 'js-yaml';
import { z } from 'zod';
import { metaLoaderGlob } from '.';
import type { MetaCollectionItem } from '@/config/build';

const querySchema = z
  .object({
    collection: z.string().optional(),
  })
  .loose();

/**
 * load meta files, fallback to bundler's built-in plugins when ?collection is unspecified.
 */
export function createMetaLoader(
  configLoader: ConfigLoader,
  resolve: {
    json?: 'json' | 'js';
    yaml?: 'yaml' | 'js';
  } = {},
): Loader {
  const { json: resolveJson = 'js', yaml: resolveYaml = 'js' } = resolve;

  function parse(filePath: string, source: string) {
    try {
      if (filePath.endsWith('.json')) return JSON.parse(source);
      if (filePath.endsWith('.yaml')) return load(source);
    } catch (e) {
      throw new Error(`invalid data in ${filePath}`, { cause: e });
    }

    throw new Error('Unknown file type ' + filePath);
  }

  function onMeta(source: string, { filePath, query }: LoaderInput) {
    const parsed = querySchema.safeParse(query);
    if (!parsed.success || !parsed.data.collection) return null;
    const collectionName = parsed.data.collection;

    return async (): Promise<unknown> => {
      const config = await configLoader.getConfig();
      const collection = config.getCollection(collectionName);
      let metaCollection: MetaCollectionItem | undefined;

      switch (collection?.type) {
        case 'meta':
          metaCollection = collection;
          break;
        case 'docs':
          metaCollection = collection.meta;
          break;
      }

      const data = parse(filePath, source);

      if (!metaCollection) return data;
      return configLoader.core.transformMeta(
        {
          collection: metaCollection,
          filePath,
          source,
        },
        data,
      );
    };
  }

  return {
    test: metaLoaderGlob,
    async load(input) {
      const result = onMeta(await input.getSource(), input);
      if (result === null) return null;
      const data = await result();

      if (input.filePath.endsWith('.json')) {
        return {
          code:
            resolveJson === 'json'
              ? JSON.stringify(data)
              : `export default ${JSON.stringify(data)}`,
        };
      } else {
        return {
          code:
            resolveYaml === 'yaml'
              ? dump(data)
              : `export default ${JSON.stringify(data)}`,
        };
      }
    },
    bun: {
      load(source, input) {
        const result = onMeta(source, input);
        if (result === null)
          return {
            loader: 'object',
            exports: parse(input.filePath, source),
          };

        return result().then((data) => ({
          loader: 'object',
          exports: { default: data },
        }));
      },
    },
  };
}
