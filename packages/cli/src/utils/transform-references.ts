import path from 'node:path';
import { type SourceFile } from 'ts-morph';
import { typescriptExtensions } from '@/constants';

/**
 * Transform references to other files (e.g. import/export from)
 *
 * @param file - source file
 * @param transform - a function that transforms module specifier
 */
export function transformReferences(
  file: SourceFile,
  transform: (specifier: string) => string | undefined,
) {
  for (const specifier of file.getImportStringLiterals()) {
    const result = transform(specifier.getLiteralValue());
    if (!result) continue;

    specifier.setLiteralValue(result);
  }
}

/**
 * Return the import modifier for `sourceFile` to import `referenceFile`
 *
 * @example
 * ```ts
 * toReferencePath('index.ts', 'dir/hello.ts')
 * // should output './dir/hello'
 * ```
 */
export function toReferencePath(
  sourceFile: string,
  referenceFile: string,
): string {
  const extname = path.extname(referenceFile);
  const importPath = path
    .relative(
      path.dirname(sourceFile),
      path.join(
        path.dirname(referenceFile),
        path.basename(
          referenceFile,
          typescriptExtensions.includes(extname) ? extname : undefined,
        ),
      ),
    )
    .replaceAll(path.sep, '/');

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

export interface ReferenceResolver {
  /**
   * Transform import aliases (e.g. `@/components`)
   */
  alias?: {
    type: 'append';
    dir: string;
  };

  /**
   * which directory to resolve relative paths from (e.g. `./components`)
   */
  relativeTo: string;
}

/**
 * Get information from references (e.g. import/export from)
 */
export function resolveReference(
  ref: string,
  resolver: ReferenceResolver,
): ResolvedImport {
  if (ref.startsWith('./') || ref.startsWith('../')) {
    return {
      type: 'file',
      path: path.join(resolver.relativeTo, ref),
    };
  }

  if (ref.startsWith('@/')) {
    const rest = ref.slice('@/'.length);
    if (!resolver.alias) throw new Error('alias resolver is not configured');

    return {
      type: 'file',
      path: path.join(resolver.alias.dir, rest),
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
