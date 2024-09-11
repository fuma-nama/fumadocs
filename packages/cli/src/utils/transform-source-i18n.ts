import * as fs from 'node:fs/promises';
import path from 'node:path';
import { type Project, StructureKind, SyntaxKind } from 'ts-morph';
import { toReferencePath } from '@/utils/transform-references';
import { type Config, defaultConfig } from '@/config';

export async function transformSourceI18n(
  project: Project,
  filePath: string,
  config: Config,
): Promise<void> {
  let content: string;

  try {
    content = await fs.readFile(filePath).then((res) => res.toString());
  } catch (e) {
    return;
  }
  const sourceFile = project.createSourceFile(filePath, content, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: toReferencePath(
      filePath,
      path.join(config.aliases?.libDir ?? defaultConfig.aliases.libDir, 'i18n'),
    ),
    namedImports: ['i18n'],
  });

  const sourceExport = sourceFile
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find((node) => node.getName() === 'source');

  if (!sourceExport) return;

  const loaderCall = sourceExport.getFirstDescendantByKind(
    SyntaxKind.ObjectLiteralExpression,
  );

  if (!loaderCall || loaderCall.getProperty('i18n')) return;

  loaderCall.addPropertyAssignment({
    name: 'i18n',
    initializer: 'i18n',
  });

  return sourceFile.save();
}
