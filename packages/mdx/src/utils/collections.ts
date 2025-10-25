import type { DocCollection, MetaCollection } from '@/config/define';
import picomatch from 'picomatch';
import type { LoadedConfig } from '@/loaders/config';
import type { FileInfo } from '@/runtime/shared';
import { glob } from 'tinyglobby';
import path from 'node:path';
import type { Core } from '@/core';

const SupportedFormats = {
  doc: ['mdx', 'md'],
  meta: ['json', 'yaml'],
};

export function getGlobPatterns(
  collection: MetaCollection | DocCollection,
): string[] {
  if (collection.files) return collection.files;
  return [`**/*.{${SupportedFormats[collection.type].join(',')}}`];
}

function isFileSupported(
  filePath: string,
  collection: MetaCollection | DocCollection,
) {
  return SupportedFormats[collection.type].some((format) =>
    filePath.endsWith(`.${format}`),
  );
}

interface ScanIndex {
  name: string;
  collection: DocCollection | MetaCollection;
  matcher: picomatch.Matcher;
}

export function createCollectionMatcher(core: Core) {
  const CacheKey = 'collection-matcher';
  return {
    scan(config: LoadedConfig) {
      const scanned: ScanIndex[] = [];

      function scan(name: string, collection: DocCollection | MetaCollection) {
        const patterns = getGlobPatterns(collection);

        for (const dir of Array.isArray(collection.dir)
          ? collection.dir
          : [collection.dir]) {
          scanned.push({
            name,
            collection,
            matcher: picomatch(patterns, {
              cwd: dir,
            }),
          });
        }
      }

      for (const [name, collection] of config.collections) {
        if (collection.type === 'docs') {
          scan(name, collection.meta);
          scan(name, collection.docs);
        } else {
          scan(name, collection);
        }
      }

      return scanned;
    },
    getFileCollection(file: string) {
      const scanned =
        (core.cache.get(CacheKey) as ScanIndex[]) ??
        this.scan(core.getConfig());

      core.cache.set(CacheKey, scanned);

      for (const item of scanned) {
        if (isFileSupported(file, item.collection) && item.matcher(file))
          return { name: item.name, collection: item.collection };
      }
    },
  };
}

export async function getCollectionFiles(
  collection: DocCollection | MetaCollection,
) {
  const files = new Map<string, FileInfo>();
  const dirs = Array.isArray(collection.dir)
    ? collection.dir
    : [collection.dir];
  const patterns = getGlobPatterns(collection);

  await Promise.all(
    dirs.map(async (dir) => {
      const result = await glob(patterns, {
        cwd: path.resolve(dir),
      });

      for (const item of result) {
        if (!isFileSupported(item, collection)) continue;
        const fullPath = path.join(dir, item);

        files.set(fullPath, {
          path: item,
          fullPath,
        });
      }
    }),
  );

  return Array.from(files.values());
}
