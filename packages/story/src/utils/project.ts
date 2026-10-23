import {
  API,
  type CompilerOptions,
  type Project as TsProject,
  type Snapshot,
  type SyntheticProjectId,
} from 'typescript/sync';
import { createFileSystemLayer } from 'typescript/fs';
import path from 'node:path';

export interface Project {
  /**
   * Make the given files, with their in-memory content, the root files of the program (similar to `tsc` with `files` set).
   *
   * @param files - absolute file path to content
   */
  load(files: Map<string, string>): TsProject;
}

export function createProject(tsconfigPath: string): Project {
  const api = new API();
  let compilerOptions: CompilerOptions;
  try {
    compilerOptions = api.parseConfigFile(path.resolve(tsconfigPath)).options;
  } catch (error) {
    api.close();
    throw error;
  }
  let rootFiles: string[] = [];
  /** content of in-memory files */
  const contents = new Map<string, string>();
  let snapshot: Snapshot | undefined;
  let id: SyntheticProjectId | undefined;

  return {
    load(files) {
      const changed: [string, string][] = [];
      for (const [file, content] of files) {
        if (contents.get(file) !== content) changed.push([file, content]);
      }
      const reconfigure =
        files.size !== rootFiles.length || rootFiles.some((file) => !files.has(file));

      if (!snapshot || reconfigure || changed.length > 0) {
        const fileSystem = createFileSystemLayer(changed);
        const program = { rootFiles: Array.from(files.keys()), compilerOptions };
        const prev = snapshot;
        if (!prev) {
          const created = api.createSnapshot({ fileSystem, createPrograms: [program] });
          id = created.operation.createdPrograms[0].id;
          snapshot = created;
        } else {
          snapshot = prev.update(
            reconfigure
              ? { fileSystem, reconfigurePrograms: [{ id: id!, ...program }] }
              : { fileSystem, ensurePrograms: [id!] },
          );
          prev.dispose();
        }
        rootFiles = program.rootFiles;
        for (const [file, content] of changed) contents.set(file, content);
      }

      return snapshot.getProject(id!)!;
    },
  };
}
