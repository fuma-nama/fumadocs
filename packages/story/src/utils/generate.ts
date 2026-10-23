import type { Project } from 'typescript/sync';
import { createTypeTreeBuilder, literalEnumHandler } from '../type-tree/builder';
import type { TypeNode } from '../type-tree/types';

export type Mode = '@fumadocs/story/vite/client' | '@fumadocs/story/next/client';

/**
 * The type alias declaration to append to story files, for resolving the props of a story.
 */
export function getControlsAlias(mode: Mode, exportName: string) {
  const name = `_StoryProps_${exportName}_`;

  return {
    name,
    code: `export type ${name} = import('${mode}').GetProps<typeof ${exportName}>;`,
  };
}

/**
 * Generate controls for an exported story, the file must contain the alias declaration of `getControlsAlias()`.
 */
export function generateControls(
  mode: Mode,
  project: Project,
  filePath: string,
  exportName: string,
): TypeNode {
  const sourceFile = project.program.getSourceFile(filePath);
  if (!sourceFile) throw new Error(`Failed to load "${filePath}" into TypeScript project`);

  const alias = getControlsAlias(mode, exportName);
  const { checker } = project;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const exports = moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : [];
  const declaration = exports
    .find((symbol) => symbol.name === alias.name)
    ?.declarations[0]?.resolve(project);

  if (!declaration || !exports.some((symbol) => symbol.name === exportName)) {
    throw new Error(`Export "${exportName}" not found in file "${filePath}"`);
  }

  return createTypeTreeBuilder(project, [literalEnumHandler]).typeToNode(
    checker.getTypeAtLocation(declaration),
    declaration,
  );
}
