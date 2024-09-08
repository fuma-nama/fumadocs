import * as fs from 'node:fs/promises';
import { Project, StructureKind, ts } from 'ts-morph';
import SyntaxKind = ts.SyntaxKind;

export async function transformSourceI18n(filePath: string): Promise<void> {
  let content: string;

  try {
    content = await fs.readFile(filePath).then((res) => res.toString());
  } catch (e) {
    return;
  }

  const project = new Project({
    compilerOptions: {},
  });
  const sourceFile = project.createSourceFile(filePath, content, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: '@/lib/i18n',
    namedImports: ['i18n'],
  });

  const sourceExport = sourceFile
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find((node) => node.getName() === 'source');

  if (!sourceExport) return;

  const loaderCall = sourceExport.getFirstDescendantByKind(
    SyntaxKind.ObjectLiteralExpression,
  );

  if (!loaderCall) return;
  if (loaderCall.getProperty('i18n')) return;

  loaderCall.addPropertyAssignment({
    name: 'i18n',
    initializer: 'i18n',
  });

  return sourceFile.save();
}
