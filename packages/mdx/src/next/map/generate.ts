import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { glob } from 'tinyglobby';
import type { LoadedConfig } from '@/loaders/config';
import type { DocCollection, MetaCollection } from '@/config';
import { validate } from '@/utils/validation';
import { fileCache } from '@/next/map/file-cache';
import type { AsyncRuntimeFile } from '@/runtime/next/types';
import { load } from 'js-yaml';
import { getGitTimestamp } from '@/utils/git-timestamp';
import { fumaMatter } from '@/utils/fuma-matter';
import {
  getImportCode,
  type ImportPathConfig,
  toImportPath,
} from '@/utils/import-formatter';
import { getGlobPatterns, isFileSupported } from '@/utils/collections';
import type { FileInfo } from '@/runtime/shared';

async function readFileWithCache(file: string): Promise<string> {
  const cached = fileCache.read<string>('read-file', file);
  if (cached) return cached;

  return (await fs.readFile(file)).toString();
}

export async function generateJS(
  configPath: string,
  config: LoadedConfig,
  importPath: ImportPathConfig,
  configHash: string | false = false,
): Promise<string> {
  let asyncInit = false;
  const lines: string[] = [
    getImportCode({
      type: 'named',
      names: ['_runtime'],
      specifier: 'fumadocs-mdx',
    }),
    getImportCode({
      type: 'namespace',
      specifier: toImportPath(configPath, importPath),
      name: '_source',
    }),
  ];

  const entries = Array.from(config.collections.entries());

  async function getDocEntries(collectionName: string, files: FileInfo[]) {
    const items = files.map(async (file, i) => {
      const importId = `${collectionName}_${i}`;
      const params = [`collection=${collectionName}`];
      if (configHash) {
        params.push(`hash=${configHash}`);
      }

      lines.unshift(
        getImportCode({
          type: 'namespace',
          name: importId,
          specifier: `${toImportPath(file.fullPath, importPath)}?${params.join('&')}`,
        }),
      );

      return `{ info: ${JSON.stringify(file)}, data: ${importId} }`;
    });

    return Promise.all(items);
  }

  async function getMetaEntries(collection: MetaCollection, files: FileInfo[]) {
    const items = files.map(async (file) => {
      const source = await readFileWithCache(file.fullPath).catch(() => '');
      let data =
        source.length === 0 ? {} : parseMetaEntry(file.fullPath, source);

      if (collection?.schema) {
        data = await validate(
          collection.schema,
          data,
          {
            source,
            path: file.fullPath,
          },
          `invalid data in ${file.fullPath}`,
        );
      }

      return JSON.stringify({
        info: file,
        data,
      });
    });

    return Promise.all(items);
  }

  async function getAsyncEntries(collection: DocCollection, files: FileInfo[]) {
    if (!asyncInit) {
      lines.unshift(
        getImportCode({
          type: 'named',
          specifier: 'fumadocs-mdx/runtime/async',
          names: ['_runtimeAsync', 'buildConfig'],
        }),
        'const _sourceConfig = buildConfig(_source)',
      );

      asyncInit = true;
    }

    const entries = files.map(async (file) => {
      const parsed = fumaMatter(
        await readFileWithCache(file.fullPath).catch(() => ''),
      );
      let data = parsed.data;

      if (collection.schema) {
        data = await validate(
          collection.schema,
          parsed.data,
          { path: file.fullPath, source: parsed.content },
          `invalid frontmatter in ${file.fullPath}`,
        );
      }

      let lastModified: Date | undefined;
      if (config.global?.lastModifiedTime === 'git') {
        lastModified = await getGitTimestamp(file.fullPath);
      }

      return JSON.stringify({
        info: file,
        lastModified,
        data: data as Record<string, unknown>,
        content: { body: parsed.content, matter: parsed.matter },
      } satisfies AsyncRuntimeFile);
    });

    return Promise.all(entries);
  }

  const declares = entries.map(async ([k, collection]) => {
    if (collection.type === 'docs') {
      const docs = await getCollectionFiles(collection.docs);
      const metas = await getCollectionFiles(collection.meta);
      const metaEntries = (await getMetaEntries(collection.meta, metas)).join(
        ', ',
      );

      if (collection.docs.async) {
        const docsEntries = (await getAsyncEntries(collection.docs, docs)).join(
          ', ',
        );

        return `export const ${k} = _runtimeAsync.docs<typeof _source.${k}>([${docsEntries}], [${metaEntries}], "${k}", _sourceConfig)`;
      }

      const docsEntries = (await getDocEntries(k, docs)).join(', ');

      return `export const ${k} = _runtime.docs<typeof _source.${k}>([${docsEntries}], [${metaEntries}])`;
    }

    const files = await getCollectionFiles(collection);

    if (collection.type === 'doc' && collection.async) {
      return `export const ${k} = _runtimeAsync.doc<typeof _source.${k}>([${(await getAsyncEntries(collection, files)).join(', ')}], "${k}", _sourceConfig)`;
    }

    return `export const ${k} = _runtime.${collection.type}<typeof _source.${k}>([${(await getDocEntries(k, files)).join(', ')}]);`;
  });

  const resolvedDeclares = await Promise.all(declares);

  return [
    `// @ts-nocheck -- skip type checking`,
    ...lines,
    ...resolvedDeclares,
  ].join('\n');
}

async function getCollectionFiles(
  collection: DocCollection | MetaCollection,
): Promise<FileInfo[]> {
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

function parseMetaEntry(file: string, content: string) {
  const extname = path.extname(file);
  try {
    if (extname === '.json') return JSON.parse(content);
    if (extname === '.yaml') return load(content);
  } catch (e) {
    throw new Error(`Failed to parse meta file: ${file}.`, {
      cause: e,
    });
  }

  throw new Error(`Unknown meta file format: ${extname}, in ${file}.`);
}
