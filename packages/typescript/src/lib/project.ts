import {
  API,
  type CompilerOptions,
  type Project as TsProject,
  type Snapshot,
  type SyntheticProjectId,
} from 'typescript/sync';
import { createFileSystemLayer } from 'typescript/fs';
import type { SourceFile } from 'typescript/ast';
import path from 'node:path';

export interface TypescriptConfig {
  tsconfigPath?: string;
}

export interface Project {
  /**
   * The underlying `typescript/sync` API instance (a native TypeScript process).
   */
  readonly api: API;
  readonly tsconfigPath: string;

  /**
   * Load a source file into the project, and optionally override its content with an in-memory version.
   *
   * The program only contains the file and the files it imports, similar to `tsc` with `files` set.
   */
  getSourceFile(
    filePath: string,
    content?: string,
  ): { project: TsProject; sourceFile: SourceFile } | undefined;

  /**
   * Stop the TypeScript process.
   */
  close(): void;
}

export async function createProject(options: TypescriptConfig = {}): Promise<Project> {
  const api = new API();
  let compilerOptions: CompilerOptions;
  try {
    compilerOptions = api.parseConfigFile(options.tsconfigPath ?? 'tsconfig.json').options;
  } catch (error) {
    api.close();
    throw error;
  }
  /** content of in-memory files */
  const contents = new Map<string, string>();
  let snapshot: Snapshot | undefined;
  let id: SyntheticProjectId | undefined;
  // the only root file of the program, a program of every loaded file costs more to rebuild and check
  let root: string | undefined;

  return {
    api,
    tsconfigPath: compilerOptions.configFilePath!,
    getSourceFile(filePath, content) {
      const file = path.resolve(filePath);
      const changed = content !== undefined && contents.get(file) !== content;

      if (!snapshot || root !== file || changed) {
        if (changed) contents.set(file, content);
        const fileSystem = createFileSystemLayer(changed ? [[file, content]] : []);
        const program = { rootFiles: [file], compilerOptions };
        const prev = snapshot;
        if (!prev) {
          const created = api.createSnapshot({ fileSystem, createPrograms: [program] });
          id = created.operation.createdPrograms[0].id;
          snapshot = created;
        } else {
          snapshot = prev.update(
            root === file
              ? { fileSystem, ensurePrograms: [id!] }
              : { fileSystem, reconfigurePrograms: [{ id: id!, ...program }] },
          );
          prev.dispose();
        }
        root = file;
      }

      const project = snapshot.getProject(id!);
      const sourceFile = project?.program.getSourceFile(file);
      if (!project || !sourceFile) return;
      return { project, sourceFile };
    },
    close() {
      snapshot?.dispose();
      snapshot = undefined;
      api.close();
    },
  };
}
