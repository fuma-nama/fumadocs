import { Node, SyntaxKind, type CallExpression, type SourceFile } from 'ts-morph';

export interface ParsedStoryCall {
  call: CallExpression;
  exportName: string;
}

function isDefineStoryCall(text: string): boolean {
  return text === 'defineStory' || text.endsWith('.defineStory');
}

export function findDefineStoryCalls(sourceFile: SourceFile): ParsedStoryCall[] {
  const stories: ParsedStoryCall[] = [];

  for (const [exportName, declarations] of sourceFile.getExportedDeclarations()) {
    for (const decl of declarations) {
      if (!Node.isVariableDeclaration(decl)) continue;

      const call = decl.getInitializer();
      if (
        !call ||
        !call.isKind(SyntaxKind.CallExpression) ||
        !isDefineStoryCall(call.getExpression().getText())
      )
        continue;

      stories.push({
        call,
        exportName,
      });
    }
  }

  return stories;
}
