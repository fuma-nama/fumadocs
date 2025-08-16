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
export function toImportSpecifier(
  sourceFile: string,
  referenceFile: string,
): string {
  const extname = path.extname(referenceFile);
  const removeExt = typescriptExtensions.includes(extname);

  const importPath = path
    .relative(
      path.dirname(sourceFile),
      removeExt
        ? referenceFile.substring(0, referenceFile.length - extname.length)
        : referenceFile,
    )
    .replaceAll(path.sep, '/');

  return importPath.startsWith('../') ? importPath : `./${importPath}`;
}
