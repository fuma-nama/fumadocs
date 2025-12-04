import type { EmitEntry, Plugin } from '@/core';
import type { DocsCollectionItem, MetaCollectionItem } from '@/config/build';
import { z } from 'zod';
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
  function getSchemaPath(name: string) {
    return `json-schema/${name}.json`;
  }

  return {
    configureServer(server) {
      const { outDir } = this.core.getOptions();
      if (!server.watcher || !insert) return;

      server.watcher.on('add', async (file) => {
        let parent: DocsCollectionItem | undefined;
        let match: MetaCollectionItem | undefined;
        for (const collection of this.core.getCollections()) {
          if (collection.type === 'meta' && collection.hasFile(file)) {
            match = collection;
            break;
          }
          if (collection.type === 'docs' && collection.meta.hasFile(file)) {
            parent = collection;
            match = collection.meta;
            break;
          }
        }

        if (!match) return;
        let obj: object;
        try {
          const content = (await fs.readFile(file)).toString();
          obj = content.length > 0 ? JSON.parse(content) : {};
        } catch {
          return;
        }

        if ('$schema' in obj) return;
        const schemaPath = path.join(
          outDir,
          getSchemaPath(parent ? `${parent.name}.meta` : match.name),
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

      for (const collection of this.core.getCollections()) {
        if (collection.type === 'docs') {
          if (collection.meta.schema instanceof z.ZodType) {
            onSchema(`${collection.name}.meta`, collection.meta.schema);
          }

          if (collection.docs.schema instanceof z.ZodType) {
            onSchema(`${collection.name}.docs`, collection.docs.schema);
          }
        } else if (collection.schema instanceof z.ZodType) {
          onSchema(collection.name, collection.schema);
        }
      }

      return files;
    },
  };
}
