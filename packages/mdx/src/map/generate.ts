import * as path from 'node:path';
import fg from 'fast-glob';
import { getTypeFromPath } from '@/utils/get-type-from-path';
import type { FileInfo } from '@/config/types';
import { type LoadedConfig } from '@/utils/load-config';
import type { DocCollection, MetaCollection } from '@/config';

export async function generateJS(
  configPath: string,
  config: LoadedConfig,
  outputPath: string,
  configHash: string,
  getFrontmatter: (file: string) => unknown | Promise<unknown>,
): Promise<string> {
  const outDir = path.dirname(outputPath);
  const imports: ImportInfo[] = [
    {
      type: 'named',
      names: ['_runtime'],
      specifier: 'fumadocs-mdx',
    },
    {
      type: 'namespace',
      specifier: toImportPath(configPath, outDir),
      name: '_source',
    },
  ];
  let asyncInit = false;
  const lines: string[] = [];

  config._runtime.files.clear();
  const entries = Array.from(config.collections.entries());

  async function getEntries(collectionName: string, files: FileInfo[]) {
    const items = files.map(async (file, i) => {
      config._runtime.files.set(file.absolutePath, collectionName);
      const importId = `${collectionName}_${i}`;

      imports.push({
        type: 'namespace',
        name: importId,
        specifier: `${toImportPath(file.absolutePath, outDir)}?collection=${collectionName}&hash=${configHash}`,
      });

      return `{ info: ${JSON.stringify(file)}, data: ${importId} }`;
    });

    return Promise.all(items);
  }

  async function getAsyncEntries(files: FileInfo[]) {
    if (!asyncInit) {
      imports.push({
        type: 'named',
        specifier: 'fumadocs-mdx/runtime/async',
        names: ['_runtimeAsync', 'buildConfig'],
      });

      lines.unshift(
        'const [err, _sourceConfig] = buildConfig(_source)',
        'if (err) throw new Error(err)',
      );

      asyncInit = true;
    }

    const entries = files.map(async (file) => {
      const frontmatter = await getFrontmatter(file.absolutePath);

      return JSON.stringify({
        info: file,
        data: frontmatter,
      });
    });

    return Promise.all(entries);
  }

  const declares = entries.map(async ([k, collection]) => {
    if (collection.type === 'docs') {
      const docs = await getCollectionFiles(collection.docs);
      const metas = await getCollectionFiles(collection.meta);

      if (collection.docs.async) {
        const docsEntries = (await getAsyncEntries(docs)).join(', ');
        const metaEntries = (await getEntries(k, metas)).join(', ');

        return `export const ${k} = _runtimeAsync.docs<typeof _source.${k}>([${docsEntries}], [${metaEntries}], "${k}", _sourceConfig)`;
      }

      return `export const ${k} = _runtime.docs<typeof _source.${k}>([${(await getEntries(k, docs)).join(', ')}], [${(await getEntries(k, metas)).join(', ')}])`;
    }

    const files = await getCollectionFiles(collection);

    if (collection.type === 'doc' && collection.async) {
      return `export const ${k} = _runtimeAsync.doc<typeof _source.${k}>([${(await getAsyncEntries(files)).join(', ')}], "${k}", _sourceConfig)`;
    }

    return `export const ${k} = _runtime.${collection.type}<typeof _source.${k}>([${(await getEntries(k, files)).join(', ')}]);`;
  });

  const resolvedDeclares = await Promise.all(declares);

  return [...imports.map(getImportCode), ...lines, ...resolvedDeclares].join(
    '\n',
  );
}

async function getCollectionFiles(
  collection: DocCollection | MetaCollection,
): Promise<FileInfo[]> {
  const files = new Map<string, FileInfo>();
  const dirs = Array.isArray(collection.dir)
    ? collection.dir
    : [collection.dir];

  await Promise.all(
    dirs.map(async (dir) => {
      const result = await fg(collection.files ?? '**/*', {
        cwd: path.resolve(dir),
        absolute: true,
      });

      for (const item of result) {
        if (getTypeFromPath(item) !== collection.type) continue;

        files.set(item, {
          path: path.relative(dir, item),
          absolutePath: item,
        });
      }
    }),
  );

  return Array.from(files.values());
}

type ImportInfo =
  | { name: string; type: 'default'; specifier: string }
  | {
      type: 'named';
      names: ([string, string] | string)[];
      specifier: string;
    }
  | {
      type: 'namespace';
      name: string;
      specifier: string;
    }
  | {
      type: 'side-effect';
      specifier: string;
    };

function getImportCode(info: ImportInfo): string {
  const specifier = JSON.stringify(info.specifier);

  if (info.type === 'default') return `import ${info.name} from ${specifier}`;
  if (info.type === 'namespace')
    return `import * as ${info.name} from ${specifier}`;
  if (info.type === 'named') {
    const names = info.names.map((name) =>
      Array.isArray(name) ? `${name[0]} as ${name[1]}` : name,
    );

    return `import { ${names.join(', ')} } from ${specifier}`;
  }

  return `import ${specifier}`;
}

export function toImportPath(file: string, dir: string): string {
  let importPath = path.relative(dir, file);

  if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
    importPath = `./${importPath}`;
  }

  return importPath.replaceAll(path.sep, '/');
}
