import path from 'node:path';
import fg from 'fast-glob';
import { getTypeFromPath } from '@/utils/get-type-from-path';
import type { FileInfo } from '@/config';
import { type LoadedConfig } from '@/config/load';

export async function generateJS(
  configPath: string,
  config: LoadedConfig,
  outputPath: string,
  hash: string,
): Promise<string> {
  const outDir = path.dirname(outputPath);

  const imports: string[] = ['import { toRuntime } from "fumadocs-mdx"'];
  const importedCollections = new Set<string>();
  const sources: string[] = [];
  const files = new Set<string>();
  let importId = 0;

  config._runtime.files.clear();

  await Promise.all(
    Array.from(config.collections.entries()).map(async ([name, collection]) => {
      const entries: string[] = [];

      const dirs = Array.isArray(collection.dir)
        ? collection.dir
        : [collection.dir];
      await Promise.all(
        dirs.map(async (dir) => {
          const included = await fg(collection.files ?? ['**/*'], {
            cwd: dir,
            absolute: true,
          });

          for (const file of included) {
            if (getTypeFromPath(file) !== collection.type || files.has(file))
              continue;

            config._runtime.files.set(file, name);
            files.add(file);

            const importName = `file_${(importId++).toString()}`;
            imports.push(
              `import * as ${importName} from ${JSON.stringify(`${toImportPath(file, outDir)}?collection=${name}&hash=${hash}`)}`,
            );

            const info: FileInfo = {
              path: path.relative(dir, file),
              absolutePath: file,
            };

            entries.push(
              `toRuntime("${collection.type}", ${importName}, ${JSON.stringify(info)})`,
            );
          }
        }),
      );

      if (collection.transform) {
        if (config.global) importedCollections.add('default'); // global config
        importedCollections.add(name);
        sources.push(
          `export const ${name} = await Promise.all([${entries.join(',')}].map(v => c_${name}.transform(v, c_default)))`,
        );
      } else {
        sources.push(`export const ${name} = [${entries.join(',')}]`);
      }
    }),
  );

  if (importedCollections.size > 0) {
    imports.push(
      `import { ${Array.from(importedCollections.values())
        .map((v) => `${v} as c_${v}`)
        .join(
          ', ',
        )} } from ${JSON.stringify(toImportPath(configPath, outDir))}`,
    );
  }

  return [...imports, ...sources].join('\n');
}

function toImportPath(file: string, dir: string): string {
  let importPath = path.relative(dir, file).replaceAll(path.sep, '/');

  if (!importPath.startsWith('.')) {
    importPath = `./${importPath}`;
  }

  return importPath;
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
