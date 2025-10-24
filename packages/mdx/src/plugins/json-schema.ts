import type { EmitEntry, Plugin } from '@/plugins';
import type { LoadedConfig } from '@/loaders/config';
import { z } from 'zod';
import { isFileInCollection } from '@/utils/collections';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface JSONSchemaOptions {
  /**
   * insert `$schema` field to JSON files on creation.
   *
   * @defaultValue false
   */
  insert?: boolean;
}

/**
 * Generate JSON schemas locally for collection schemas
 *
 * note: **it only works with Zod**
 */
export default function jsonSchema({
  insert = false,
}: JSONSchemaOptions = {}): Plugin {
  let config: LoadedConfig;

  function getSchemaPath(name: string) {
    return `json-schema/${name}.json`;
  }

  return {
    config(v) {
      config = v;
    },
    configureServer(server) {
      if (!server.watcher || !insert) return;

      server.watcher.on('add', async (file) => {
        for (const [name, collection] of config.collections) {
          const single =
            collection.type === 'docs' ? collection.meta : collection;

          if (single.type !== 'meta' || !isFileInCollection(file, single))
            continue;

          let obj: object;
          try {
            const content = (await fs.readFile(file)).toString();
            obj = content.length > 0 ? JSON.parse(content) : {};
          } catch {
            return;
          }

          if ('$schema' in obj) return;
          const schemaPath = path.join(
            this.outDir,
            getSchemaPath(collection.type === 'docs' ? `${name}.meta` : name),
          );
          const updated = {
            $schema: path.relative(path.dirname(file), schemaPath),
            ...obj,
          };

          // TODO: try persist formatting?
          await fs.writeFile(file, JSON.stringify(updated, null, 2));
          return;
        }
      });
    },
    emit() {
      const files: EmitEntry[] = [];

      function onSchema(name: string, schema: z.ZodSchema) {
        files.push({
          path: getSchemaPath(name),
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
