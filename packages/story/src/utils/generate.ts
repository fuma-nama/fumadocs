import { createTypeTreeBuilder, literalEnumHandler } from '../type-tree/builder';
import type { TypeNode } from '../type-tree/types';
import type { Project } from 'ts-morph';

export async function createControlsProject(tsconfigPath: string): Promise<Project> {
  const { Project } = await import('ts-morph');

  return new Project({
    tsConfigFilePath: tsconfigPath,
    skipAddingFilesFromTsConfig: true,
  });
}

export type Mode = '@fumadocs/story/vite/client' | '@fumadocs/story/next/client';

export function generateControls(
  mode: Mode,
  project: Project,
  filePath: string,
  exportName: string,
  content: string,
): TypeNode {
  const aliasName = `_StoryProps_${exportName}_`;
  const sourceFile =
    project.getSourceFile(filePath) ??
    project.createSourceFile(filePath, content, {
      overwrite: true,
    });

  if (!sourceFile.getTypeAlias(aliasName)) {
    sourceFile.addTypeAlias({
      isExported: true,
      name: aliasName,
      type: `import('${mode}').GetProps<typeof ${exportName}>`,
    });
  }

  const declarations = sourceFile.getExportedDeclarations();
  const declaration = declarations.get(aliasName)?.[0];
  if (!declaration || !declarations.get(exportName)) {
    throw new Error(`Export "${exportName}" not found in file "${filePath}"`);
  }

  return createTypeTreeBuilder(project, [literalEnumHandler]).typeToNode(
    declaration.getType(),
    declaration,
  );
}
