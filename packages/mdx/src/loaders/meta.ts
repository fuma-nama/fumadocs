import type { Loader } from '@/loaders/adapter';
import type { ConfigLoader } from '@/loaders/config';
import { dump, load } from 'js-yaml';
import { validate } from '@/utils/validation';
import { z } from 'zod';
import { metaLoaderGlob } from '.';

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

  function stringifyOutput(isJson: boolean, data: unknown) {
    if (isJson) {
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
      const collection = parsed.collection
        ? (await configLoader.getConfig()).getCollection(parsed.collection)
        : undefined;
      if (!collection) return null;

      const isJson = filePath.endsWith('.json');
      const source = await getSource();
      let data: unknown;
      try {
        data = isJson ? JSON.parse(source) : load(source);
      } catch (e) {
        throw new Error(`invalid data in ${filePath}`, { cause: e });
      }

      let schema;
      switch (collection?.type) {
        case 'meta':
          schema = collection.schema;
          break;
        case 'docs':
          schema = collection.meta.schema;
          break;
      }

      if (schema) {
        data = await validate(
          schema,
          data,
          { path: filePath, source },
          `invalid data in ${filePath}`,
        );
      }

      return {
        code: stringifyOutput(isJson, data),
      };
    },
    bun: {
      async fallback({ getSource, filePath }) {
        const source = await getSource();
        const isJson = filePath.endsWith('.json');
        let data: unknown;
        try {
          data = isJson ? JSON.parse(source) : load(source);
        } catch (e) {
          throw new Error(`invalid data in ${filePath}`, { cause: e });
        }

        return {
          loader: 'object',
          exports: data as Record<string, unknown>,
        };
      },
    },
  };
}
