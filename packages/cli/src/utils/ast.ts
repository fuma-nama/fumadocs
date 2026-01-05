import path from 'node:path';
import { typescriptExtensions } from '@/constants';
import { type Program, Visitor } from 'oxc-parser';
import type MagicString from 'magic-string';

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

export function transformSpecifiers(
  program: Program,
  s: MagicString,
  transformSpecifier: (value: string) => string | undefined,
) {
  new Visitor({
    // static imports
    ImportDeclaration(node) {
      const source = node.source;
      const out = transformSpecifier(source.value);
      if (out) {
        s.update(source.start + 1, source.end - 1, out);
        source.value = out;
      }
    },
    // dynamic imports
    ImportExpression(node) {
      if (node.source.type === 'Literal') {
        const source = node.source;
        const out = transformSpecifier(source.value as string);
        if (out) {
          s.update(source.start + 1, source.end - 1, out);
          source.value = out;
        }
      }
    },
    // exports
    ExportAllDeclaration(node) {
      const source = node.source;
      const out = transformSpecifier(source.value);
      if (out) {
        s.update(source.start + 1, source.end - 1, out);
        source.value = out;
      }
    },
    ExportNamedDeclaration(node) {
      const source = node.source;
      if (!source) return;
      const out = transformSpecifier(source.value);
      if (out) {
        s.update(source.start + 1, source.end - 1, out);
        source.value = out;
      }
    },
  }).visit(program);
}
