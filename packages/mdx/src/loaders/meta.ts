import type { Loader, LoaderInput } from '@/loaders/adapter';
import type { ConfigLoader } from '@/loaders/config';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { MetaCollectionItem } from '@/config/build';
import { runModule } from '@/loaders/mdx/code';
import { slash } from '@/utils/codegen';
import { getStaticParams, type MetaData, type Params } from 'fumadocs-core/source';
import { readFileSync } from 'node:fs';
import { metaModule } from '../../../shared/frontmatter-code';
import path from 'node:path';

const querySchema = z.looseObject({
  collection: z.string().optional(),
  workspace: z.string().optional(),
  macro_id: z.string().optional(),
});

/** the data of a meta file, see {@link metaModule} for modules like `meta.ts` */
function parse(
  filePath: string,
  source: string,
  addDependency: (file: string) => void,
): { data: MetaData; dataAt?: (params: Params) => MetaData } {
  if (/\.[jt]s$/.test(filePath)) return metaModule(runModule(filePath, source, addDependency));

  try {
    if (filePath.endsWith('.json')) return { data: JSON.parse(source) };
    if (filePath.endsWith('.yaml')) return { data: parseYaml(source) };
  } catch (e) {
    throw new Error(`invalid data in ${filePath}`, { cause: e });
  }

  throw new Error('Unknown file type ' + filePath);
}

/** read the `staticParams` of a meta file in `dir`, by its path without the extension, like `[framework]/meta` */
export function readStaticParams(
  dir: string,
  file: string,
  addDependency: (file: string) => void,
): Params[] | undefined {
  for (const ext of ['.json', '.yaml', '.ts', '.js']) {
    const metaFile = path.join(dir, file + ext);
    addDependency(metaFile);
    let content: string;
    try {
      content = readFileSync(metaFile, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    return parse(metaFile, content, addDependency).data?.staticParams;
  }
}

/**
 * load meta files, fallback to bundler's built-in plugins when ?collection is unspecified.
 */
export function createMetaLoader(
  { getCore }: ConfigLoader,
  resolve: {
    json?: 'json' | 'js';
    yaml?: 'js';
  } = {},
): Loader {
  const { json: resolveJson = 'js' } = resolve;

  function onMeta(source: string, { filePath, query, compiler }: LoaderInput) {
    const parsed = querySchema.safeParse(query);
    if (!parsed.success) return null;
    const { collection: collectionName, workspace, macro_id: macroId } = parsed.data;
    // a meta file belongs to either a config collection or a macro collection
    if (!collectionName && macroId === undefined) return null;

    return async (): Promise<unknown> => {
      let core = await getCore();
      // macro collections live on the root core, read it before switching to a workspace
      const macro = core.macro;
      if (workspace) {
        core = core.getWorkspaces().get(workspace) ?? core;
      }

      let metaCollection: MetaCollectionItem | undefined;
      if (macro && macroId !== undefined) {
        const resolved = await macro.resolve(macroId);
        for (const input of resolved.inputs) compiler.addDependency(input);

        const item = resolved.collection;
        if (item.type === 'docs') metaCollection = item.meta;
        else if (item.type === 'meta') metaCollection = item;
      } else if (collectionName) {
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

      const { data, dataAt } = parse(filePath, source, compiler.addDependency);
      if (!metaCollection) return data;
      const options = { collection: metaCollection, filePath, source };
      if (!dataAt) return core.transformMeta(options, data);

      // the data in each folder of its params, the module doesn't run at runtime
      const { dir } = metaCollection;
      const out = { ...data, _dataAt: {} as Record<string, unknown> };
      const list = getStaticParams(slash(path.relative(dir, filePath)), {
        readStaticParams: (file) => readStaticParams(dir, file, compiler.addDependency),
      });
      for (const params of list ?? [])
        out._dataAt[JSON.stringify(params)] = await core.transformMeta(options, {
          ...data,
          ...dataAt(params),
        });
      return out;
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
            exports: parse(input.filePath, source, () => undefined).data as Record<string, unknown>,
          };

        return result().then((data) => ({
          loader: 'object',
          exports: { default: data },
        }));
      },
    },
  };
}
