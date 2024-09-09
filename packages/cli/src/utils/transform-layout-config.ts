import fs from 'node:fs/promises';
import { SyntaxKind } from 'ts-morph';
import { createEmptyProject } from '@/utils/typescript';

export async function transformLayoutConfig(filePath: string): Promise<void> {
  let content: string;

  try {
    content = await fs.readFile(filePath).then((res) => res.toString());
  } catch (_) {
    return;
  }

  const project = createEmptyProject();

  const sourceFile = project.createSourceFile(filePath, content, {
    overwrite: true,
  });

  const configExport = sourceFile
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find((node) => node.getName() === 'baseOptions');

  if (!configExport) return;

  const init = configExport.getInitializerIfKind(
    SyntaxKind.ObjectLiteralExpression,
  );
  if (!init) return;
  if (init.getProperty('i18n')) return;

  init.addPropertyAssignment({
    name: 'i18n',
    initializer: 'true',
  });

  return sourceFile.save();
}
