import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
}

export type CodeGen = ReturnType<typeof createCodegen>;

export function createCodegen({
  target = 'default',
  outDir = '',
  jsExtension = false,
}: Partial<CodeGenOptions>) {
  let eagerImportId = 0;
  const lines: string[] = [];
  const globCache = new Map<string, Promise<string[]>>();

  if (target === 'vite') {
    lines.push('/// <reference types="vite/client" />');
  }

  function generateViteGlobImport(
    outDir: string,
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
  }

  async function generateNodeGlobImport(
    patterns: string | string[],
    { base, eager = false, query = {}, import: importName }: GlobImportOptions,
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
      const url = pathToFileURL(fullPath);

      for (const [k, v] of Object.entries(query)) {
        url.searchParams.set(k, v);
      }

      if (eager) {
        const name = `__fd_glob_${eagerImportId++}`;
        lines.unshift(
          importName
            ? `import { ${importName} as ${name} } from ${JSON.stringify(url.href)}`
            : `import * as ${name} from ${JSON.stringify(url.href)}`,
        );

        code += `${JSON.stringify(item)}: ${name}, `;
      } else {
        let line = `${JSON.stringify(item)}: () => import(${JSON.stringify(url.href)})`;
        if (importName) {
          line += `.then(mod => mod.${importName})`;
        }

        code += `${line}, `;
      }
    }

    code += '}';
    return code;
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

  return {
    options: {
      target,
      outDir,
    } as CodeGenOptions,
    lines,
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
        return generateViteGlobImport(outDir, patterns, options);
      }

      return generateNodeGlobImport(patterns, options);
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
      return lines.join('\n');
    },
  };
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
