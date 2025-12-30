import path from 'node:path';
import { typescriptExtensions } from '@/constants';

/**
 * Return the import modifier for `sourceFile` to import `referenceFile`
 *
 * @example
 * ```ts
 * toReferencePath('index.ts', 'dir/hello.ts')
 * // should output './dir/hello'
 * ```
 */
export function toImportSpecifier(sourceFile: string, referenceFile: string): string {
  const extname = path.extname(referenceFile);
  const removeExt = typescriptExtensions.includes(extname);

  let importPath = path
    .relative(
      path.dirname(sourceFile),
      removeExt ? referenceFile.substring(0, referenceFile.length - extname.length) : referenceFile,
    )
    .replaceAll(path.sep, '/');

  if (removeExt && importPath.endsWith('/index')) {
    importPath = importPath.slice(0, -'/index'.length);
  }

  return importPath.startsWith('../') ? importPath : `./${importPath}`;
}
