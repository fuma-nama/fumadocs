import type { Loader } from '@/loaders/adapter';
import type { ConfigLoader } from '@/loaders/config';
import { dump, load } from 'js-yaml';
import { validate } from '@/utils/validation';
import { z } from 'zod';

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

  return async ({ filePath, query, source }) => {
    const isJson = filePath.endsWith('.json');
    const parsed = querySchema.parse(query);
    const collection = parsed.collection
      ? (await configLoader.getConfig()).getCollection(parsed.collection)
      : undefined;
    if (!collection) return null;

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

    let code: string;
    if (isJson) {
      code =
        resolveJson === 'json'
          ? JSON.stringify(data)
          : `export default ${JSON.stringify(data)}`;
    } else {
      code =
        resolveYaml === 'yaml'
          ? dump(data)
          : `export default ${JSON.stringify(data)}`;
    }

    return {
      code,
      map: null,
    };
  };
}
