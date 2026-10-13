import {
  isObjectLiteralExpression,
  isPropertyAssignment,
  type ObjectLiteralExpression,
  type SourceFile,
} from 'typescript/unstable/ast';
import { generateControls, getControlsAlias, type Mode, type Project } from './generate';
import type { TypeNode } from '../type-tree/types';
import { findDefineStoryCalls, type ParsedStoryCall } from './parse';
import { serialize } from '@/utils/serialization';

interface TextEdit {
  start: number;
  end: number;
  text: string;
}

function getPropertyName(name: string): string {
  return /^['"`]/.test(name) ? name.slice(1, -1) : name;
}

/**
 * Create the edits to inject `_generated` into the options object literal
 */
function injectControls(
  sourceFile: SourceFile,
  object: ObjectLiteralExpression,
  exportName: string,
  controls: TypeNode,
): TextEdit {
  const initializer = `{ exportName: ${JSON.stringify(exportName)}, controls: ${JSON.stringify(serialize(controls))} }`;
  const existing = object.properties.find(
    (prop) =>
      isPropertyAssignment(prop) && getPropertyName(prop.name.getText(sourceFile)) === '_generated',
  );

  if (existing) {
    return {
      start: existing.getStart(sourceFile),
      end: existing.getEnd(),
      text: `_generated: ${initializer}`,
    };
  }

  const last = object.properties.at(-1);
  if (!last) {
    const start = object.getStart(sourceFile) + 1;
    return { start, end: start, text: ` _generated: ${initializer} ` };
  }

  const lastStart = last.getStart(sourceFile);
  const lineStart = sourceFile.text.lastIndexOf('\n', lastStart) + 1;
  const indent = /^\s*/.exec(sourceFile.text.slice(lineStart, lastStart))?.[0] ?? '';

  return {
    start: last.getEnd(),
    end: last.getEnd(),
    text: `,\n${indent}_generated: ${initializer}`,
  };
}

function applyEdits(code: string, edits: TextEdit[]): string {
  let out = code;
  for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}

export function transformStoryFile(
  mode: Mode,
  code: string,
  id: string,
  project: Project,
): string | undefined {
  const loaded = project.getSourceFile(id, code);
  if (!loaded) throw new Error(`Failed to load "${id}" into TypeScript project`);

  const calls: ParsedStoryCall[] = [];
  // type alias declarations are appended to the end, positions of `code` stay valid.
  let aliases = '';
  for (const parsed of findDefineStoryCalls(loaded.project, loaded.sourceFile)) {
    // invalid structure
    if (parsed.call.arguments.length !== 1) continue;
    calls.push(parsed);

    const alias = getControlsAlias(mode, parsed.exportName);
    if (!code.includes(alias.code)) aliases += `\n${alias.code}`;
  }
  if (calls.length === 0) return;

  const content = code + aliases;
  const edits: TextEdit[] = [];

  for (const parsed of calls) {
    const [optionsArg] = parsed.call.arguments;

    if (!isObjectLiteralExpression(optionsArg)) {
      throw new Error(
        'defineStory() options must be an object literal to inject controls from @fumadocs/story.',
      );
    }

    const controls = generateControls(mode, project, id, parsed.exportName, content);
    edits.push(injectControls(loaded.sourceFile, optionsArg, parsed.exportName, controls));
  }

  return applyEdits(code, edits) + aliases;
}
