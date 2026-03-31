import path from 'node:path';
import { typescriptExtensions } from '@/constants';
import { type Program, Visitor } from 'oxc-parser';
import type MagicString from 'magic-string';
import type { ImportDeclaration, ImportDeclarationSpecifier } from '@oxc-project/types';

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

function getImportedBinding(
  spec: ImportDeclarationSpecifier,
): { imported: string; local: string } | null {
  if (spec.type === 'ImportSpecifier') {
    let imported: string;
    switch (spec.imported.type) {
      case 'Identifier':
        imported = spec.imported.name;
        break;
      case 'Literal':
        imported = spec.imported.value;
        break;
    }

    return {
      imported,
      local: spec.local.name,
    };
  }
  if (spec.type === 'ImportDefaultSpecifier') {
    return { imported: 'default', local: spec.local.name };
  }
  return null;
}

export function collectMacroBindings(
  program: Program,
  name: string,
): { importDecls: ImportDeclaration[]; locals: Set<string> } | null {
  const locals = new Set<string>();
  const importDecls: ImportDeclaration[] = [];
  const seenDecl = new Set<ImportDeclaration>();

  new Visitor({
    ImportDeclaration(node: ImportDeclaration) {
      for (const spec of node.specifiers) {
        const b = getImportedBinding(spec);
        if (!b || b.imported !== name) continue;

        locals.add(b.local);

        if (!seenDecl.has(node)) {
          seenDecl.add(node);
          importDecls.push(node);
        }
      }
    },
  }).visit(program);

  if (locals.size === 0) return null;
  return { importDecls, locals };
}
