import type { Loader } from '@/loaders/adapter';
import type { ConfigLoader } from '@/loaders/config';
import { dump, load } from 'js-yaml';
import { validate } from '@/utils/validation';
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

  function stringifyOutput(filePath: string, data: unknown) {
    if (filePath.endsWith('.json')) {
      return resolveJson === 'json'
        ? JSON.stringify(data)
        : `export default ${JSON.stringify(data)}`;
    } else {
      return resolveYaml === 'yaml'
        ? dump(data)
        : `export default ${JSON.stringify(data)}`;
    }
  }

  return {
    test: metaLoaderGlob,
    async load({ filePath, query, getSource }) {
      const parsed = querySchema.parse(query);
      if (!parsed.collection) return null;

      const collection = (await configLoader.getConfig()).getCollection(
        parsed.collection,
      );

      let metaCollection: MetaCollectionItem;
      switch (collection?.type) {
        case 'meta':
          metaCollection = collection;
          break;
        case 'docs':
          metaCollection = collection.meta;
          break;
        default:
          return null;
      }

      const source = await getSource();
      let data = parse(filePath, source);
      if (metaCollection.schema) {
        data = await validate(
          metaCollection.schema,
          data,
          { path: filePath, source },
          `invalid data in ${filePath}`,
        );
      }

      return {
        code: stringifyOutput(filePath, data),
      };
    },
    bun: {
      loadSync(source, { filePath }) {
        return {
          loader: 'object',
          exports: parse(filePath, source) as Record<string, unknown>,
        };
      },
    },
  };
}
