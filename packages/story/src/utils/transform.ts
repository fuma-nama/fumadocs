import { SyntaxKind } from 'ts-morph';
import { generateControls, Mode } from './generate';
import type { TypeNode } from '../type-tree/types';
import { findDefineStoryCalls, ParsedStoryCall } from './parse';
import type { Project } from 'ts-morph';
import { serialize } from '@/utils/serialization';

function injectControls(parsed: ParsedStoryCall, controls: TypeNode) {
  const [optionsArg] = parsed.call.getArguments();

  if (optionsArg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error(
      'defineStory() options must be an object literal to inject controls from @fumadocs/story.',
    );
  }

  const object = optionsArg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  object.getProperty('_generated')?.remove();
  object.addPropertyAssignment({
    name: '_generated',
    initializer: `{ exportName: ${JSON.stringify(parsed.exportName)}, controls: ${JSON.stringify(serialize(controls))} }`,
  });
}

export function transformStoryFile(
  mode: Mode,
  code: string,
  id: string,
  project: Project,
): string | undefined {
  const sourceFile = project.createSourceFile(id, code, { overwrite: true });
  const calls = findDefineStoryCalls(sourceFile);
  if (calls.length === 0) return;

  for (const parsed of calls) {
    const args = parsed.call.getArguments();
    // invalid structure
    if (args.length !== 1) continue;

    const controls = generateControls(mode, project, id, parsed.exportName, code);
    injectControls(parsed, controls);
  }

  return sourceFile.getFullText();
}
