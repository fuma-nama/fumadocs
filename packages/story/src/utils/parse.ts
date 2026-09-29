import { type Project, SymbolFlags } from 'typescript/unstable/sync';
import {
  type CallExpression,
  isCallExpression,
  isVariableDeclaration,
  type SourceFile,
} from 'typescript/unstable/ast';

export interface ParsedStoryCall {
  call: CallExpression;
  exportName: string;
}

function isDefineStoryCall(text: string): boolean {
  return text === 'defineStory' || text.endsWith('.defineStory');
}

/**
 * Find `defineStory()` calls exported from the source file.
 */
export function findDefineStoryCalls(project: Project, sourceFile: SourceFile): ParsedStoryCall[] {
  const { checker } = project;
  const stories: ParsedStoryCall[] = [];
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return stories;

  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol =
      (exported.flags & SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(exported) : exported;

    for (const handle of symbol.declarations) {
      const decl = handle.resolve(project);
      // only declarations in the same file can be transformed
      if (!decl || !isVariableDeclaration(decl) || decl.getSourceFile() !== sourceFile) continue;

      const call = decl.initializer;
      if (!call || !isCallExpression(call) || !isDefineStoryCall(call.expression.getText()))
        continue;

      stories.push({
        call,
        exportName: exported.name,
      });
    }
  }

  return stories;
}
