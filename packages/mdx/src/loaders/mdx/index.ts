import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { Loader, LoaderOutput } from '@/loaders/adapter';
import { z } from 'zod';
import type { DocCollectionItem } from '@/config/build';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ConfigLoader } from '@/loaders/config';
import { slash } from '@/utils/codegen';
import { getStaticParams, isDynamicPath, type PageData } from 'fumadocs-core/source';
import { frontmatterCode, resolveFrontmatter } from '@/loaders/mdx/code';
import { readStaticParams } from '@/loaders/meta';

const querySchema = z.looseObject({
  only: z.literal(['frontmatter', 'all']).default('all'),
  collection: z.string().optional(),
  workspace: z.string().optional(),
  macro_id: z.string().optional(),
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
      } = querySchema.parse(query);
      if (workspace) {
        core = core.getWorkspaces().get(workspace) ?? core;
      }

      let after: (() => Promise<void>) | undefined;
      const code = frontmatterCode(filePath, matter.content);
      if (code) matter.content = code.content;

      const { experimentalBuildCache = false } = core.getConfig().global;
      if (
        !isDevelopment &&
        !importsOnly &&
        experimentalBuildCache &&
        only === 'all' &&
        // the frontmatter in code depends on the files it imports, a dynamic file on meta files
        !code &&
        !isDynamicPath(slash(filePath))
      ) {
        const cacheDir = experimentalBuildCache;
        // macro ids contain path separators, keep the key a valid file name
        const scope = (macroId ?? collectionName ?? 'global').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cacheKey = `${scope}_${generateCacheHash(filePath)}`;

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

      const validate = (data: Record<string, unknown>) =>
        docCollection
          ? core.transformFrontmatter({ collection: docCollection, filePath, source: value }, data)
          : data;

      let staticParams;
      if (docCollection) {
        const { dir } = docCollection;
        staticParams = getStaticParams(slash(path.relative(dir, filePath)), {
          staticParams: (matter.data as PageData).staticParams,
          readStaticParams: (file) => readStaticParams(dir, file, compiler.addDependency),
        });
      }

      const data = await resolveFrontmatter({
        code,
        yaml: matter.data as Record<string, unknown>,
        staticParams,
        validate,
        addDependency: compiler.addDependency,
        // lazy collections read the head
        listed: only === 'frontmatter' || !docCollection?.async,
      });
      if (only === 'frontmatter') {
        return { code: `export const frontmatter = ${JSON.stringify(data)}` };
      }

      const { buildMDX } = await import('@/loaders/mdx/build');
      const compiled = await buildMDX(core, docCollection, {
        isDevelopment,
        // ensure the line number is correct in errors
        source: '\n'.repeat(countLines(matter.matter)) + matter.content,
        filePath,
        frontmatter: data,
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
