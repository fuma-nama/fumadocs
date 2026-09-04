import { createTypeTreeBuilder, literalEnumHandler } from '../type-tree/builder';
import type { TypeNode } from '../type-tree/types';
import { createProject, type Project } from './project';

export type { Project };

export async function createControlsProject(tsconfigPath: string): Promise<Project> {
  return createProject(tsconfigPath);
}

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
 * Generate controls for an exported story.
 *
 * @param content - content of the story file, the alias declaration of `getControlsAlias()` is appended when missing.
 */
export function generateControls(
  mode: Mode,
  project: Project,
  filePath: string,
  exportName: string,
  content: string,
): TypeNode {
  const alias = getControlsAlias(mode, exportName);
  if (!content.includes(alias.code)) content = `${content}\n${alias.code}`;

  const loaded = project.getSourceFile(filePath, content);
  if (!loaded) throw new Error(`Failed to load "${filePath}" into TypeScript project`);

  const { project: tsProject, sourceFile } = loaded;
  const { checker } = tsProject;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const exports = moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : [];
  const declaration = exports
    .find((symbol) => symbol.name === alias.name)
    ?.declarations[0]?.resolve(tsProject);
  const type = declaration ? checker.getTypeAtLocation(declaration) : undefined;

  if (!declaration || !type || !exports.some((symbol) => symbol.name === exportName)) {
    throw new Error(`Export "${exportName}" not found in file "${filePath}"`);
  }

  return createTypeTreeBuilder(tsProject, [literalEnumHandler]).typeToNode(type, declaration);
}
