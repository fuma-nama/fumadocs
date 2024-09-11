import path from 'node:path';
import { type SourceFile } from 'ts-morph';
import { type Config, defaultConfig } from '@/config';
import { type Awaitable } from '@/commands/init';

/**
 * Find the transformed output path of input ref.
 *
 * extension name of `ref` is optional.
 */
export function getOutputPath(ref: string, config: Config): string {
  if (path.isAbsolute(ref)) throw new Error(`path cannot be absolute: ${ref}`);

  if (ref.startsWith('components/ui')) {
    return path.join(
      config.aliases?.uiDir ?? defaultConfig.aliases.uiDir,
      path.relative('components/ui', ref),
    );
  }

  if (ref.startsWith('components')) {
    return path.join(
      config.aliases?.componentsDir ?? defaultConfig.aliases.componentsDir,
      path.relative('components', ref),
    );
  }

  if (ref.startsWith('lib')) {
    return path.join(
      config.aliases?.libDir ?? defaultConfig.aliases.libDir,
      path.relative('lib', ref),
    );
  }

  if (ref === 'utils/cn' || ref === 'utils/cn.ts') {
    return config.aliases?.cn ?? defaultConfig.aliases.cn;
  }

  return ref;
}

/**
 * Transform references to other files (e.g. import/export from)
 *
 * @param file - source file
 * @param useSrc - add ./src when resolving `@/*` alias import
 * @param transform - a function that transforms module specifier
 */
export async function transformReferences(
  file: SourceFile,
  useSrc: boolean,
  transform: (src: ResolvedImport) => Awaitable<string | undefined>,
): Promise<void> {
  for (const item of file.getImportDeclarations()) {
    const result = await transform(
      resolveReference(
        item.getModuleSpecifier().getLiteralValue(),
        file.getFilePath(),
        useSrc,
      ),
    );
    if (!result) continue;

    item.getModuleSpecifier().setLiteralValue(result);
  }

  for (const item of file.getExportDeclarations()) {
    const specifier = item.getModuleSpecifier();
    if (!specifier) continue;
    const result = await transform(
      resolveReference(specifier.getLiteralValue(), file.getFilePath(), useSrc),
    );
    if (!result) continue;

    specifier.setLiteralValue(result);
  }
}

export function toReferencePath(
  sourceFile: string,
  referenceFile: string,
): string {
  const importPath = path.relative(
    path.dirname(sourceFile),
    path.join(
      path.dirname(referenceFile),
      path.basename(referenceFile, path.extname(referenceFile)),
    ),
  );

  return importPath.startsWith('../') ? importPath : `./${importPath}`;
}

export type ResolvedImport =
  | {
      type: 'dep';
      name: string;
    }
  | {
      type: 'file';
      /**
       * Path relative to root directory (without ext)
       */
      path: string;
    };

/**
 * Get information from references (e.g. import/export from)
 */
export function resolveReference(
  ref: string,
  from: string,
  src: boolean,
): ResolvedImport {
  if (ref.startsWith('./') || ref.startsWith('../')) {
    return {
      type: 'file',
      path: path.join(path.dirname(from), ref),
    };
  }

  if (ref.startsWith('@/')) {
    const rest = ref.slice('@/'.length);

    return {
      type: 'file',
      path: src ? path.join('./src', rest) : rest,
    };
  }

  if (ref.startsWith('@')) {
    const segments = ref.split('/');

    return {
      type: 'dep',
      name: segments.slice(0, 2).join('/'),
    };
  }

  return {
    type: 'dep',
    name: ref.split('/')[0],
  };
}
