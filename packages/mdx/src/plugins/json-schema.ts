import type { EmitEntry, Plugin } from '@/core';
import type { LoadedConfig } from '@/loaders/config';
import { z } from 'zod';
import { createCollectionMatcher } from '@/utils/collections';
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
      const matcher = createCollectionMatcher(this.core);

      server.watcher.on('add', async (file) => {
        const match = matcher.getFileCollection(file);
        if (!match || match.collection.type !== 'meta') return;

        const { name } = match;
        const parent = config.collections.get(name);

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
          getSchemaPath(parent?.type === 'docs' ? `${name}.meta` : name),
        );
        const updated = {
          $schema: path.relative(path.dirname(file), schemaPath),
          ...obj,
        };

        await fs.writeFile(file, JSON.stringify(updated, null, 2));
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
