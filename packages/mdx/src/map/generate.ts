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
  const outDir = path.dirname(outputPath);
  const imports: ImportInfo[] = [
    {
      type: 'named',
      names: ['toRuntime'],
      specifier: 'fumadocs-mdx',
    },
  ];
  let asyncInit = false;
  const lines: string[] = [];

  config._runtime.files.clear();
  const entries = Array.from(config.collections.entries());

  const declares = entries.map(async ([k, collection]) => {
    const files = await getCollectionFiles(collection);

    if (collection.type === 'doc' && collection.async) {
      if (!asyncInit) {
        imports.push(
          {
            type: 'namespace',
            specifier: toImportPath(configPath, outDir),
            name: '_source',
          },
          {
            type: 'named',
            specifier: 'fumadocs-mdx/runtime/async',
            names: ['asyncFiles', 'buildConfig'],
          },
        );

        lines.unshift(
          'const [err, _sourceConfig] = buildConfig(_source)',
          'if (err) throw new Error(err)',
        );

        asyncInit = true;
      }

      const entries = files.map(async (file) => {
        const frontmatter = await getFrontmatter(file.absolutePath);

        return JSON.stringify({
          frontmatter,
          file,
        });
      });

      return `export const ${k} = asyncFiles([${(await Promise.all(entries)).join(', ')}], "${k}", _sourceConfig)`;
    }

    const items = files.map(async (file, i) => {
      config._runtime.files.set(file.absolutePath, k);
      const importId = `${k}_${i}`;

      imports.push({
        type: 'namespace',
        name: importId,
        specifier: `${toImportPath(file.absolutePath, outDir)}?collection=${k}&hash=${configHash}`,
      });

      return `toRuntime("${collection.type}", ${importId}, ${JSON.stringify(file)})`;
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
