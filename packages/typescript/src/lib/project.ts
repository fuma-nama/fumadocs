import { API, type Project as TsProject, type Snapshot } from 'typescript/unstable/sync';
import type { SourceFile } from 'typescript/unstable/ast';
import fs from 'node:fs';
import path from 'node:path';

export interface TypescriptConfig {
  tsconfigPath?: string;
}

export interface Project {
  /**
   * The underlying `typescript/unstable/sync` API instance (a native TypeScript process).
   */
  readonly api: API;
  readonly tsconfigPath: string;

  /**
   * Load a source file into the project, and optionally override its content with an in-memory version.
   *
   * Only loaded files (and the files they import) are part of the program, similar to `tsc` with `files` set.
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

function normalizePath(p: string): string {
  let out = path.resolve(p).replaceAll('\\', '/');
  if (process.platform === 'win32' && /^[A-Z]:/.test(out)) {
    out = out[0].toLowerCase() + out.slice(1);
  }
  return out;
}

function readDiskFile(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }
}

export async function createProject(options: TypescriptConfig = {}): Promise<Project> {
  const tsconfigPath = normalizePath(options.tsconfigPath ?? './tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) throw new Error(`tsconfig file not found: ${tsconfigPath}`);

  const dir = path.posix.dirname(tsconfigPath);
  /** in-memory files, overriding the file system */
  const virtualFiles = new Map<string, string>();
  /** root files of the generated tsconfig */
  const rootFiles = new Set<string>();
  let snapshot: Snapshot | undefined;

  // a virtual tsconfig extending the user's one, with only loaded files as roots.
  // this keeps the program (and memory) small compared to loading the entire project.
  let configPath = `${dir}/tsconfig.fumadocs-typescript.json`;
  for (let i = 0; fs.existsSync(configPath); i++) {
    configPath = `${dir}/tsconfig.fumadocs-typescript.${i}.json`;
  }

  function writeConfig() {
    virtualFiles.set(
      configPath,
      JSON.stringify({
        extends: `./${path.posix.basename(tsconfigPath)}`,
        include: [],
        files: Array.from(rootFiles),
      }),
    );
  }

  const api = new API({
    cwd: dir,
    fs: {
      // return `undefined` to fall back to the real file system
      readFile: (fileName) => virtualFiles.get(normalizePath(fileName)),
    },
  });

  return {
    api,
    tsconfigPath,
    getSourceFile(filePath, content) {
      const key = normalizePath(filePath);
      const changed: string[] = [];
      const created: string[] = [];

      if (content !== undefined) {
        const isVirtual = virtualFiles.has(key);
        const current = isVirtual ? virtualFiles.get(key) : readDiskFile(key);

        if (current !== content) {
          virtualFiles.set(key, content);
          if (current !== undefined) changed.push(key);
          else created.push(key);
        }
      }

      if (!rootFiles.has(key)) {
        rootFiles.add(key);
        writeConfig();
        changed.push(configPath);
      }

      if (!snapshot) {
        snapshot = api.updateSnapshot({ openProjects: [configPath] });
      } else if (changed.length > 0 || created.length > 0) {
        const prev = snapshot;
        snapshot = api.updateSnapshot({
          fileChanges: {
            changed: changed.length > 0 ? changed : undefined,
            created: created.length > 0 ? created : undefined,
          },
        });
        prev.dispose();
      }

      const project = snapshot.getProject(configPath);
      if (!project) return;

      const sourceFile = project.program.getSourceFile(key);
      if (!sourceFile) return;

      return { project, sourceFile };
    },
    close() {
      snapshot?.dispose();
      snapshot = undefined;
      api.close();
    },
  };
}
