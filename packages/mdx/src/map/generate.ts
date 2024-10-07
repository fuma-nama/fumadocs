import * as path from 'node:path';
import fg from 'fast-glob';
import { getTypeFromPath } from '@/utils/get-type-from-path';
import type { Collections, FileInfo } from '@/config';
import { type LoadedConfig } from '@/config/load';

interface VariableInfo {
  name: string;
  content: string;
}

export async function generateJS(
  configPath: string,
  config: LoadedConfig,
  outputPath: string,
  hash: string,
): Promise<string> {
  const outDir = path.dirname(outputPath);

  const imports: ImportInfo[] = [
    {
      type: 'named',
      names: ['toRuntime'],
      specifier: 'fumadocs-mdx',
    },
  ];
  const importedCollections = new Set<string>();
  const variables: VariableInfo[] = [];

  config._runtime.files.clear();
  const collected = await Promise.all(
    Array.from(config.collections.entries()).map(async ([name, collection]) =>
      processCollection(
        name,
        collection,
        config,
        hash,
        outDir,
        importedCollections,
      ),
    ),
  );

  collected.forEach((v) => {
    imports.push(...v.imports);
    variables.push(v.variable);
  });

  if (importedCollections.size > 0) {
    imports.push({
      type: 'named',
      names: Array.from(importedCollections.values())
        .sort()
        .map((v) => [v, `c_${v}`] as const),
      specifier: toImportPath(configPath, outDir),
    });
  }

  return [
    ...imports.map(getImportCode),
    ...variables.map((v) => `export const ${v.name} = ${v.content};`),
  ].join('\n');
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

async function processCollection(
  name: string,
  collection: Collections,
  config: LoadedConfig,
  configHash: string,
  importDir: string,
  requiredCollection: Set<string>,
): Promise<{
  variable: VariableInfo;
  imports: ImportInfo[];
}> {
  const dirs = Array.isArray(collection.dir)
    ? collection.dir
    : [collection.dir];
  // absolute path to file info
  const files = new Map<string, FileInfo>();

  for (const dir of dirs) {
    const result = await fg(collection.files ?? ['**/*'], {
      cwd: dir,
      absolute: true,
    });

    result.forEach((file) => {
      files.set(file, {
        path: path.relative(dir, file),
        absolutePath: file,
      });
    });
  }

  const output = processDirectory(
    Array.from(files.values()),
    config,
    configHash,
    name,
    collection,
    importDir,
  );

  if (collection.transform) {
    if (config.global) requiredCollection.add('default'); // import global config
    requiredCollection.add(name);
  }

  return {
    imports: output.imports,
    variable: {
      name,
      content: collection.transform
        ? `await Promise.all([${output.entries.join(',')}].map(v => c_${name}.transform(v, c_default)))`
        : `[${output.entries.join(',')}]`,
    },
  };
}

function processDirectory(
  files: FileInfo[],
  config: LoadedConfig,
  configHash: string,
  name: string,
  collection: Collections,
  importFrom: string,
): {
  imports: ImportInfo[];
  entries: string[];
} {
  const imports: ImportInfo[] = [];
  const entries: string[] = [];

  for (const file of files) {
    if (getTypeFromPath(file.absolutePath) !== collection.type) continue;
    if (config._runtime.files.has(file.absolutePath)) {
      const belongs = config._runtime.files.get(file.absolutePath);

      console.warn(
        `[MDX] Files cannot exist in multiple collections: ${file.path} (${belongs ?? ''} and ${name})`,
      );

      continue;
    }

    config._runtime.files.set(file.absolutePath, name);

    const importName = `${name}_${entries.length.toString()}`;
    imports.push({
      type: 'namespace',
      name: importName,
      specifier: `${toImportPath(file.absolutePath, importFrom)}?collection=${name}&hash=${configHash}`,
    });

    entries.push(
      `toRuntime("${collection.type}", ${importName}, ${JSON.stringify(file)})`,
    );
  }

  return {
    entries,
    imports,
  };
}

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

function toImportPath(file: string, dir: string): string {
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
