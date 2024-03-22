import * as path from 'node:path';
import ts from 'typescript';

const cache = new Map<string, ts.Program>();

export interface TypescriptConfig {
  files?: string[];
  tsconfigPath?: string;
  /** A root directory to resolve relative path entries in the config file to. e.g. outDir */
  basePath?: string;

  /**
   * Default lib directory, use `./node_modules/typescript/lib` if not specified
   */
  getDefaultLibLocation?: (() => string) | 'default';
}

export function getFileSymbol(
  file: string,
  program: ts.Program,
): ts.Symbol | undefined {
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) return;

  return checker.getSymbolAtLocation(sourceFile);
}

export function getProgram(options: TypescriptConfig = {}): ts.Program {
  const key = JSON.stringify(options);
  const cached = cache.get(key);

  if (cached) return cached;

  const configFile = ts.readJsonConfigFile(
    options.tsconfigPath ?? './tsconfig.json',
    (p) => ts.sys.readFile(p),
  );

  const parsed = ts.parseJsonSourceFileConfigFileContent(
    configFile,
    ts.sys,
    options.basePath ?? './',
  );

  // disable cache
  parsed.options.incremental = false;

  const host = ts.createCompilerHost(parsed.options);

  // The default host gives an invalid lib location
  // todo: remove if Typescript fixed this problem
  if (options.getDefaultLibLocation !== 'default') {
    host.getDefaultLibLocation =
      options.getDefaultLibLocation ??
      (() => path.resolve('./node_modules/typescript/lib'));
  }

  const program = ts.createProgram({
    rootNames: options.files ?? parsed.fileNames,
    host,
    options: parsed.options,
    configFileParsingDiagnostics: parsed.errors,
    projectReferences: parsed.projectReferences,
  });

  cache.set(key, program);

  return program;
}
