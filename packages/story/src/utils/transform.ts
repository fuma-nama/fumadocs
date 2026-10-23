import {
  isObjectLiteralExpression,
  isPropertyAssignment,
  type ObjectLiteralExpression,
  type SourceFile,
} from 'typescript/ast';
import { setImmediate } from 'node:timers/promises';
import { generateControls, getControlsAlias, type Mode } from './generate';
import type { TypeNode } from '../type-tree/types';
import { findDefineStoryCalls, type ParsedStoryCall } from './parse';
import { createProject, type Project } from './project';
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

interface TransformRequest {
  id: string;
  code: string;
  resolve: (result: string | undefined) => void;
  reject: (error: unknown) => void;
}

interface StoryFile {
  request: TransformRequest;
  /** the source file of `code` */
  sourceFile: SourceFile;
  calls: ParsedStoryCall[];
  /** type alias declarations appended to the end, positions of `code` stay valid. */
  aliases: string;
}

/**
 * Transform a batch of files with two program updates: one to find the stories, one to generate their controls.
 */
async function transformStoryFiles(
  mode: Mode,
  project: Project,
  requests: TransformRequest[],
): Promise<void> {
  const files = new Map<string, string>();
  for (const { id, code } of requests) files.set(id, code);
  let tsProject = project.load(files);
  const stories: StoryFile[] = [];

  for (const request of requests) {
    try {
      const sourceFile = tsProject.program.getSourceFile(request.id);
      if (!sourceFile) throw new Error(`Failed to load "${request.id}" into TypeScript project`);

      const calls: ParsedStoryCall[] = [];
      let aliases = '';
      for (const parsed of findDefineStoryCalls(tsProject, sourceFile)) {
        // invalid structure
        if (parsed.call.arguments.length !== 1) continue;
        calls.push(parsed);

        const alias = getControlsAlias(mode, parsed.exportName);
        if (!request.code.includes(alias.code)) aliases += `\n${alias.code}`;
      }

      if (calls.length > 0) stories.push({ request, sourceFile, calls, aliases });
      else request.resolve(undefined);
    } catch (error) {
      request.reject(error);
    }
    await setImmediate();
  }
  if (stories.length === 0) return;

  files.clear();
  for (const { request, aliases } of stories) files.set(request.id, request.code + aliases);
  tsProject = project.load(files);

  for (const { request, sourceFile, calls, aliases } of stories) {
    try {
      const edits: TextEdit[] = [];
      for (const { call, exportName } of calls) {
        const [optionsArg] = call.arguments;
        if (!isObjectLiteralExpression(optionsArg)) {
          throw new Error(
            'defineStory() options must be an object literal to inject controls from @fumadocs/story.',
          );
        }

        const controls = generateControls(mode, tsProject, request.id, exportName);
        edits.push(injectControls(sourceFile, optionsArg, exportName, controls));
      }
      request.resolve(applyEdits(request.code, edits) + aliases);
    } catch (error) {
      request.reject(error);
    }
    await setImmediate();
  }
}

export type StoryTransformer = (code: string, id: string) => Promise<string | undefined>;

/**
 * Requests made while a batch is running are transformed together in the next batch.
 */
export function createStoryTransformer(mode: Mode, tsconfigPath: string): StoryTransformer {
  let project: Project | undefined;
  let queue: TransformRequest[] = [];
  let running = false;
  /** the latest result of each file, with the code it is transformed from */
  const results = new Map<string, { code: string; result: Promise<string | undefined> }>();

  async function run() {
    // requests of the same tick join the batch
    await setImmediate();

    while (queue.length > 0) {
      const batch = new Map<string, TransformRequest>();
      const next: TransformRequest[] = [];
      for (const request of queue) {
        // a file has only one content in a program
        if (batch.has(request.id)) next.push(request);
        else batch.set(request.id, request);
      }
      queue = next;

      try {
        project ??= createProject(tsconfigPath);
        await transformStoryFiles(mode, project, Array.from(batch.values()));
      } catch (error) {
        for (const request of batch.values()) request.reject(error);
      }
    }
    running = false;
  }

  return (code, id) => {
    const cached = results.get(id);
    if (cached?.code === code) return cached.result;

    const result = new Promise<string | undefined>((resolve, reject) => {
      queue.push({ id, code, resolve, reject });
    });
    results.set(id, { code, result });
    if (!running) {
      running = true;
      void run();
    }
    return result;
  };
}
