import type { Loader, LoaderInput } from '@/loaders/adapter';
import type { ConfigLoader } from '@/loaders/config';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { MetaCollectionItem } from '@/config/build';
import { resolveMacroCollection, type MacroContext } from '@/macro/eval';

const querySchema = z.looseObject({
  collection: z.string().optional(),
  workspace: z.string().optional(),
  cfg: z.string().optional(),
  id: z.coerce.number().optional(),
});

/**
 * load meta files, fallback to bundler's built-in plugins when ?collection is unspecified.
 */
export function createMetaLoader(
  { getCore }: ConfigLoader,
  resolve: {
    json?: 'json' | 'js';
    yaml?: 'js';
  } = {},
  macro?: MacroContext,
): Loader {
  const { json: resolveJson = 'js' } = resolve;

  function parse(filePath: string, source: string) {
    try {
      if (filePath.endsWith('.json')) return JSON.parse(source);
      if (filePath.endsWith('.yaml')) return parseYaml(source);
    } catch (e) {
      throw new Error(`invalid data in ${filePath}`, { cause: e });
    }

    throw new Error('Unknown file type ' + filePath);
  }

  function onMeta(source: string, { filePath, query, compiler }: LoaderInput) {
    const parsed = querySchema.safeParse(query);
    if (!parsed.success || !parsed.data.collection) return null;
    const { collection: collectionName, workspace, cfg, id } = parsed.data;

    return async (): Promise<unknown> => {
      let core = await getCore();
      if (workspace) {
        core = core.getWorkspaces().get(workspace) ?? core;
      }

      let metaCollection: MetaCollectionItem | undefined;
      if (macro && cfg !== undefined && id !== undefined) {
        const resolved = await resolveMacroCollection(macro, cfg, id);
        for (const input of resolved.inputs) compiler.addDependency(input);

        const item = resolved.collection;
        if (item.type === 'docs') metaCollection = item.meta;
        else if (item.type === 'meta') metaCollection = item;
      } else {
        const collection = core.getCollection(collectionName);

        switch (collection?.type) {
          case 'meta':
            metaCollection = collection;
            break;
          case 'docs':
            metaCollection = collection.meta;
            break;
        }
      }

      const data = parse(filePath, source);

      if (!metaCollection) return data;
      return core.transformMeta(
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
    async load(input) {
      const result = onMeta(await input.getSource(), input);
      if (result === null) return null;
      const data = await result();

      if (input.filePath.endsWith('.json')) {
        return {
          moduleType: resolveJson,
          code:
            resolveJson === 'json'
              ? JSON.stringify(data)
              : `export default ${JSON.stringify(data)}`,
        };
      } else {
        return {
          moduleType: 'js',
          code: `export default ${JSON.stringify(data)}`,
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
