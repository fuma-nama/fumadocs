import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { Loader, LoaderOutput } from '@/loaders/adapter';
import { z } from 'zod';
import type { DocCollectionItem } from '@/config/build';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ConfigLoader } from '@/loaders/config';
import { slash } from '@/utils/codegen';
import {
  getStaticParams,
  isDynamicPath,
  type MetaData,
  type PageData,
  type Params,
} from 'fumadocs-core/source';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const querySchema = z.looseObject({
  only: z.literal(['frontmatter', 'all']).default('all'),
  collection: z.string().optional(),
  workspace: z.string().optional(),
  macro_id: z.string().optional(),
  /** the values of the path params to compile the file for, as JSON */
  params: z.string().optional(),
});

const cacheEntry = z.object({
  code: z.string(),
  map: z.any().optional(),
  hash: z.string().optional(),
});

type CacheEntry = z.infer<typeof cacheEntry>;

export function createMdxLoader({ getCore }: ConfigLoader): Loader {
  return {
    async load({ getSource, development: isDevelopment, query, compiler, filePath, importsOnly }) {
      let core = await getCore();
      // macro collections live on the root core, read it before switching to a workspace
      const macro = core.macro;
      const value = await getSource();
      const matter = frontmatter(value);
      const {
        collection: collectionName,
        workspace,
        only,
        macro_id: macroId,
        params,
      } = querySchema.parse(query);
      if (workspace) {
        core = core.getWorkspaces().get(workspace) ?? core;
      }

      let after: (() => Promise<void>) | undefined;

      const { experimentalBuildCache = false } = core.getConfig().global;
      if (
        !isDevelopment &&
        !importsOnly &&
        experimentalBuildCache &&
        only === 'all' &&
        // the module of a dynamic file depends on meta files
        (params !== undefined || !isDynamicPath(slash(filePath)))
      ) {
        const cacheDir = experimentalBuildCache;
        // macro ids contain path separators, keep the key a valid file name
        const scope = (macroId ?? collectionName ?? 'global').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cacheKey = `${scope}_${generateCacheHash(params ? `${filePath}?${params}` : filePath)}`;

        const cached = await fs
          .readFile(path.join(cacheDir, cacheKey), 'utf-8')
          .then((content) => cacheEntry.parse(JSON.parse(content)))
          .catch(() => null);

        if (cached && cached.hash === generateCacheHash(value)) return cached;
        after = async () => {
          await fs.mkdir(cacheDir, { recursive: true });
          await fs.writeFile(
            path.join(cacheDir, cacheKey),
            JSON.stringify({
              ...out,
              hash: generateCacheHash(value),
            } satisfies CacheEntry),
          );
        };
      }

      let docCollection: DocCollectionItem | undefined;
      if (macro && macroId !== undefined) {
        const resolved = await macro.resolve(macroId);
        for (const input of resolved.inputs) compiler.addDependency(input);

        const item = resolved.collection;
        if (item.type === 'docs') docCollection = item.docs;
        else if (item.type === 'doc') docCollection = item;
      } else {
        const collection = collectionName ? core.getCollection(collectionName) : undefined;

        switch (collection?.type) {
          case 'doc':
            docCollection = collection;
            break;
          case 'docs':
            docCollection = collection.docs;
            break;
        }
      }

      if (docCollection) {
        matter.data = await core.transformFrontmatter(
          { collection: docCollection, filePath, source: value },
          matter.data as Record<string, unknown>,
        );
      }

      let staticParams: Params[] | undefined;
      if (docCollection && params === undefined) {
        const { dir } = docCollection;
        staticParams = getStaticParams(slash(path.relative(dir, filePath)), {
          staticParams: (matter.data as PageData).staticParams,
          readStaticParams(file) {
            for (const ext of ['.json', '.yaml']) {
              const metaFile = path.join(dir, file + ext);
              compiler.addDependency(metaFile);
              let content: string;
              try {
                content = readFileSync(metaFile, 'utf-8');
              } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
                throw error;
              }
              return (parse(content) as MetaData | null)?.staticParams;
            }
          },
        });
      }

      if (only === 'frontmatter') {
        return { code: `export const frontmatter = ${JSON.stringify(matter.data)}` };
      }
      if (staticParams) return { code: dynamicModule(filePath, query, matter.data, staticParams) };

      const { buildMDX } = await import('@/loaders/mdx/build');
      const compiled = await buildMDX(core, docCollection, {
        isDevelopment,
        // ensure the line number is correct in errors
        source: '\n'.repeat(countLines(matter.matter)) + matter.content,
        filePath,
        frontmatter: matter.data as Record<string, unknown>,
        params: params === undefined ? undefined : (JSON.parse(params) as Params),
        importsOnly,
        _compiler: compiler,
        environment: 'bundler',
      });

      const out: LoaderOutput = {
        code: compiled.code,
        moduleType: 'js',
        map: compiled.map,
      };

      await after?.();
      return out;
    },
  };
}

/** the module of a dynamic file, it imports the file compiled for each of its params */
function dynamicModule(
  filePath: string,
  query: Record<string, string | string[] | undefined>,
  frontmatter: unknown,
  staticParams: Params[],
): string {
  let code = `export const frontmatter = ${JSON.stringify(frontmatter)};\nexport const _pages = {`;
  let imports = '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (typeof v === 'string') search.set(k, v);
  for (let i = 0; i < staticParams.length; i++) {
    const key = JSON.stringify(staticParams[i]);
    search.set('params', key);
    imports += `import * as _p${i} from ${JSON.stringify(`./${path.basename(filePath)}?${search}`)};\n`;
    code += `${JSON.stringify(key)}: _p${i},`;
  }
  return `${imports}${code}};`;
}

function generateCacheHash(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

function countLines(s: string) {
  let num = 0;

  for (const c of s) {
    if (c === '\n') num++;
  }

  return num;
}
