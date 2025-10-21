import type { EmitEntry, Plugin } from '@/plugins';
import type { LoadedConfig } from '@/loaders/config';
import { z } from 'zod';

/**
 * Generate JSON schemas locally for collection schemas
 *
 * note: **it only works with Zod**
 */
export default function jsonSchema(): Plugin {
  let config: LoadedConfig;

  return {
    config(v) {
      config = v;
    },
    emit() {
      const files: EmitEntry[] = [];

      function onSchema(name: string, schema: z.ZodSchema) {
        files.push({
          path: `json-schema/${name}.json`,
          content: JSON.stringify(
            z.toJSONSchema(schema, {
              io: 'input',
              unrepresentable: 'any',
            }),
          ),
        });
      }

      for (const [name, collection] of config.collections) {
        if (collection.type === 'docs') {
          if (collection.meta.schema instanceof z.ZodType) {
            onSchema(`${name}.meta`, collection.meta.schema);
          }

          if (collection.docs.schema instanceof z.ZodType) {
            onSchema(`${name}.docs`, collection.docs.schema);
          }
        } else if (collection.schema instanceof z.ZodType) {
          onSchema(name, collection.schema);
        }
      }

      return files;
    },
  };
}
