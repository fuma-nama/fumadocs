import * as path from 'node:path';
import fg from 'fast-glob';
import { getTypeFromPath } from '@/utils/get-type-from-path';
import type { FileInfo } from '@/config/types';
import {
  type InternalDocCollection,
  type InternalMetaCollection,
  type LoadedConfig,
} from '@/utils/load-config';

export async function generateJS(
  configPath: string,
  config: LoadedConfig,
  outputPath: string,
  configHash: string,
  getFrontmatter: (file: string) => Promise<unknown>,
): Promise<string> {
  const experimentalRemote = true;
  const outDir = path.dirname(outputPath);
  const imports: ImportInfo[] = [
    {
      type: 'named',
      names: ['toRuntime', 'toRuntimeAsync'],
      specifier: 'fumadocs-mdx',
    },
  ];
  const lines: string[] = [];

  if (experimentalRemote) {
    imports.push(
      {
        type: 'default',
        specifier: 'node:fs/promises',
        name: 'fs',
      },
      {
        type: 'namespace',
        specifier: toImportPath(configPath, outDir),
        name: '_source',
      },
      {
        type: 'named',
        specifier: 'fumadocs-mdx/config',
        names: ['buildConfig'],
      },
      {
        type: 'named',
        specifier: 'fumadocs-mdx/runtime/mdx',
        names: ['remarkInclude'],
      },
      {
        type: 'named',
        specifier: '@fumadocs/mdx-remote',
        names: ['compileMDX'],
      },
    );

    lines.push(
      'const [err, _sourceConfig] = buildConfig(_source)',
      'if (err) throw new Error(err)',
      'var _temp = _sourceConfig.global?.mdxOptions ?? {}',
      '_temp = typeof _temp === "function"? await _temp() : _temp',
      'const _temp_remark = _temp.remarkPlugins',
      'const _mdxOptions = { ..._temp, remarkPlugins: (v) => typeof _temp_remark === "function"? [remarkInclude, ..._temp_remark(v)] : [remarkInclude, ...v, ...(_temp_remark ?? [])] }',
    );
  }

  async function generateEntry(
    file: FileInfo,
    collectionName: string,
    collection: InternalDocCollection | InternalMetaCollection,
    importId: string,
  ): Promise<string> {
    if (collection.type === 'doc' && collection.async) {
      const frontmatter = await getFrontmatter(file.absolutePath);

      if (experimentalRemote)
        return `toRuntimeAsync(${JSON.stringify(frontmatter)}, async () => {
const source = await fs.readFile(${JSON.stringify(file.absolutePath)})
const collection = _sourceConfig.collections.get(${JSON.stringify(collectionName)})
const mdxOptions = collection?.mdxOptions ?? _mdxOptions

const { body, ...res } = await compileMDX({ source: source.toString(), filePath: ${JSON.stringify(file.absolutePath)}, mdxOptions })
return { ...res, default: body }
}, ${JSON.stringify(file)})`;

      const importPath = `${toImportPath(file.absolutePath, outDir)}?hash=${configHash}&collection=${collectionName}`;
      return `toRuntimeAsync(${JSON.stringify(frontmatter)}, () => import(${JSON.stringify(importPath)}), ${JSON.stringify(file)})`;
    }

    imports.push({
      type: 'namespace',
      name: importId,
      specifier: `${toImportPath(file.absolutePath, outDir)}?collection=${collectionName}&hash=${configHash}`,
    });

    return `toRuntime("${collection.type}", ${importId}, ${JSON.stringify(file)})`;
  }

  config._runtime.files.clear();
  const entries = Array.from(config.collections.entries());

  const declares = entries.map(async ([k, collection]) => {
    const files = await getCollectionFiles(collection);
    const items = files.map(async (file, i) => {
      config._runtime.files.set(file.absolutePath, k);

      return generateEntry(file, k, collection, `${k}_${i}`);
    });

    const resolvedItems = await Promise.all(items);

    return `export const ${k} = [${resolvedItems.join(', ')}];`;
  });

  const resolvedDeclares = await Promise.all(declares);

  return [...imports.map(getImportCode), ...lines, ...resolvedDeclares].join(
    '\n',
  );
}

async function getCollectionFiles(
  collection: InternalDocCollection | InternalMetaCollection,
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

export function generateTypes(
  configPath: string,
  config: LoadedConfig,
  outputPath: string,
): string {
  const importPath = JSON.stringify(
    toImportPath(configPath, path.dirname(outputPath)),
  );
  const lines: string[] = [
    'import type { GetOutput } from "fumadocs-mdx/config"',
  ];

  for (const name of config.collections.keys()) {
    lines.push(
      `export declare const ${name}: GetOutput<typeof import(${importPath}).${name}>`,
    );
  }

  return lines.join('\n');
}
