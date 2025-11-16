import path from 'node:path';
import { glob } from 'tinyglobby';

export interface GlobImportOptions {
  base: string;
  query?: Record<string, string>;
  import?: string;
  eager?: boolean;
}

export interface CodeGenOptions {
  target: 'default' | 'vite';
  outDir: string;
  /**
   * add .js extenstion to imports
   */
  jsExtension: boolean;
  globCache: Map<string, Promise<string[]>>;
}

export type CodeGen = ReturnType<typeof createCodegen>;

/**
 * Code generator (one instance per file)
 */
export function createCodegen({
  target = 'default',
  outDir = '',
  jsExtension = false,
  globCache = new Map(),
}: Partial<CodeGenOptions>) {
  let eagerImportId = 0;
  const banner: string[] = ['// @ts-nocheck'];

  if (target === 'vite') {
    banner.push('/// <reference types="vite/client" />');
  }

  return {
    options: {
      target,
      outDir,
    } as CodeGenOptions,
    lines: [] as string[],
    addImport(statement: string) {
      this.lines.unshift(statement);
    },
    async pushAsync(insert: Promise<string | undefined>[]) {
      for (const line of await Promise.all(insert)) {
        if (line === undefined) continue;

        this.lines.push(line);
      }
    },

    async generateGlobImport(
      patterns: string | string[],
      options: GlobImportOptions,
    ): Promise<string> {
      if (target === 'vite') {
        return this.generateViteGlobImport(patterns, options);
      }

      return this.generateNodeGlobImport(patterns, options);
    },

    generateViteGlobImport(
      patterns: string | string[],
      { base, ...rest }: GlobImportOptions,
    ): string {
      patterns = (typeof patterns === 'string' ? [patterns] : patterns).map(
        normalizeViteGlobPath,
      );

      return `import.meta.glob(${JSON.stringify(patterns)}, ${JSON.stringify(
        {
          base: normalizeViteGlobPath(path.relative(outDir, base)),
          ...rest,
        },
        null,
        2,
      )})`;
    },
    async generateNodeGlobImport(
      patterns: string | string[],
      {
        base,
        eager = false,
        query = {},
        import: importName,
      }: GlobImportOptions,
    ): Promise<string> {
      const cacheKey = JSON.stringify({ patterns, base });
      let files = globCache.get(cacheKey);
      if (!files) {
        files = glob(patterns, {
          cwd: base,
        });
        globCache.set(cacheKey, files);
      }

      let code: string = '{';
      for (const item of await files) {
        const fullPath = path.join(base, item);
        const searchParams = new URLSearchParams();

        for (const [k, v] of Object.entries(query)) {
          searchParams.set(k, v);
        }

        const importPath =
          this.formatImportPath(fullPath) + '?' + searchParams.toString();
        if (eager) {
          const name = `__fd_glob_${eagerImportId++}`;
          this.lines.unshift(
            importName
              ? `import { ${importName} as ${name} } from ${JSON.stringify(importPath)}`
              : `import * as ${name} from ${JSON.stringify(importPath)}`,
          );

          code += `${JSON.stringify(item)}: ${name}, `;
        } else {
          let line = `${JSON.stringify(item)}: () => import(${JSON.stringify(importPath)})`;
          if (importName) {
            line += `.then(mod => mod.${importName})`;
          }

          code += `${line}, `;
        }
      }

      code += '}';
      return code;
    },
    formatImportPath(file: string) {
      const ext = path.extname(file);
      let filename: string;

      if (ext === '.ts' && jsExtension) {
        filename = file.substring(0, file.length - ext.length) + '.js';
      } else if (ext === '.ts') {
        filename = file.substring(0, file.length - ext.length);
      } else {
        filename = file;
      }

      const importPath = slash(path.relative(outDir, filename));
      return importPath.startsWith('.') ? importPath : `./${importPath}`;
    },
    toString() {
      return [...banner, ...this.lines].join('\n');
    },
  };
}

/**
 * convert into POSIX & relative file paths, such that Vite can accept it.
 */
function normalizeViteGlobPath(file: string) {
  file = slash(file);
  if (file.startsWith('./')) return file;
  if (file.startsWith('/')) return `.${file}`;

  return `./${file}`;
}

export function slash(path: string): string {
  const isExtendedLengthPath = path.startsWith('\\\\?\\');

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replaceAll('\\', '/');
}

export function ident(code: string, tab: number = 1) {
  return code
    .split('\n')
    .map((v) => '  '.repeat(tab) + v)
    .join('\n');
}
