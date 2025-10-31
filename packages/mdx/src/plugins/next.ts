import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  DocCollectionItem,
  LoadedConfig,
  MetaCollectionItem,
} from '@/config/build';
import { validate } from '@/utils/validation';
import { readFileWithCache } from '@/next/file-cache';
import { getGitTimestamp } from '@/utils/git-timestamp';
import { fumaMatter } from '@/utils/fuma-matter';
import {
  getImportCode,
  type ImportPathConfig,
  toImportPath,
} from '@/utils/import-formatter';
import type { FileInfo } from '@/runtime/shared';
import type { Plugin } from '@/core';
import { load } from 'js-yaml';

export default function next(): Plugin {
  let config: LoadedConfig;
  let shouldEmitOnChange = false;

  return {
    name: 'next',
    config(v) {
      config = v;

      // always emit again when async mode enabled
      shouldEmitOnChange = config.collectionList.some((collection) => {
        return (
          (collection.type === 'doc' && collection.async) ||
          collection.type === 'docs' ||
          collection.type === 'meta'
        );
      });
    },
    configureServer(server) {
      if (!server.watcher) return;

      server.watcher.on('all', async (event) => {
        if (event === 'change' && !shouldEmitOnChange) return;

        await this.core.emitAndWrite({
          filterPlugin: (plugin) => plugin.name === 'next',
        });
      });
    },
    async emit() {
      return [
        {
          path: 'index.ts',
          content: await indexFile(this.configPath, config, {
            relativeTo: this.outDir,
          }),
        },
      ];
    },
  };
}

export async function indexFile(
  configPath: string,
  config: LoadedConfig,
  importPath: ImportPathConfig,
): Promise<string> {
  let asyncInit = false;
  const lines: string[] = [
    getImportCode({
      type: 'named',
      names: ['_runtime'],
      specifier: 'fumadocs-mdx/runtime/next',
    }),
    getImportCode({
      type: 'namespace',
      specifier: toImportPath(configPath, importPath),
      name: '_source',
    }),
  ];

  function getDocEntries(collection: DocCollectionItem, files: FileInfo[]) {
    return files.map((file, i) => {
      const importId = `d_${collection.name}_${i}`;
      const params = [`collection=${collection.name}`];

      lines.unshift(
        getImportCode({
          type: 'namespace',
          name: importId,
          specifier: `${toImportPath(file.fullPath, importPath)}?${params.join('&')}`,
        }),
      );

      return `{ info: ${JSON.stringify(file)}, data: ${importId} }`;
    });
  }

  async function getMetaEntries(
    collection: MetaCollectionItem,
    files: FileInfo[],
  ) {
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

  async function getAsyncEntries(
    collection: DocCollectionItem,
    files: FileInfo[],
  ) {
    if (!asyncInit) {
      lines.unshift(
        getImportCode({
          type: 'named',
          specifier: 'fumadocs-mdx/runtime/async',
          names: ['_runtimeAsync', 'buildConfig'],
        }),
        'const _sourceConfig = buildConfig(_source)',
        getImportCode({
          type: 'default',
          name: 'path',
          specifier: 'node:path',
        }),
      );

      asyncInit = true;
    }

    const entries = files.map(async (file) => {
      const content = await readFileWithCache(file.fullPath).catch(() => '');
      const parsed = fumaMatter(content);
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

      const hash = createHash('md5').update(content).digest('hex');
      const infoStr: string[] = [];
      for (const [k, v] of Object.entries({ ...file, hash })) {
        infoStr.push(`${k}: ${JSON.stringify(v)}`);
      }
      infoStr.push(
        `absolutePath: path.resolve(${JSON.stringify(file.fullPath)})`,
      );

      return `{ info: { ${infoStr.join(', ')} }, lastModified: ${JSON.stringify(lastModified)}, data: ${JSON.stringify(data)} }`;
    });

    return Promise.all(entries);
  }

  const declares = config.collectionList.map(async (collection) => {
    const k = collection.name;
    if (collection.type === 'docs') {
      const docs = await globCollectionFiles(collection.docs);
      const metas = await globCollectionFiles(collection.meta);
      const metaEntries = (await getMetaEntries(collection.meta, metas)).join(
        ', ',
      );

      if (collection.docs.async) {
        const docsEntries = (await getAsyncEntries(collection.docs, docs)).join(
          ', ',
        );

        return `export const ${k} = _runtimeAsync.docs<typeof _source.${k}>([${docsEntries}], [${metaEntries}], "${k}", _sourceConfig)`;
      }

      const docsEntries = getDocEntries(collection.docs, docs).join(', ');

      return `export const ${k} = _runtime.docs<typeof _source.${k}>([${docsEntries}], [${metaEntries}])`;
    }

    const files = await globCollectionFiles(collection);

    if (collection.type === 'meta') {
      return `export const ${k} = _runtime.meta<typeof _source.${k}>([${(await getMetaEntries(collection, files)).join(', ')}]);`;
    }

    if (collection.async) {
      return `export const ${k} = _runtimeAsync.doc<typeof _source.${k}>([${(await getAsyncEntries(collection, files)).join(', ')}], "${k}", _sourceConfig)`;
    }

    return `export const ${k} = _runtime.doc<typeof _source.${k}>([${getDocEntries(collection, files).join(', ')}]);`;
  });

  const resolvedDeclares = await Promise.all(declares);

  return [
    `// @ts-nocheck -- skip type checking`,
    ...lines,
    ...resolvedDeclares,
  ].join('\n');
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

async function globCollectionFiles(
  collection: DocCollectionItem | MetaCollectionItem,
) {
  const { glob } = await import('tinyglobby');
  const files = new Map<string, FileInfo>();
  const dirs = Array.isArray(collection.dir)
    ? collection.dir
    : [collection.dir];

  await Promise.all(
    dirs.map(async (dir) => {
      const result = await glob(collection.patterns, {
        cwd: path.resolve(dir),
      });

      for (const item of result) {
        if (!collection.isFileSupported(item)) continue;
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
