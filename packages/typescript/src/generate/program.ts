import * as ts from 'typescript';

const cache = new Map<string, ts.Program>();

export interface TypescriptConfig {
  files?: string[];
  tsconfigPath?: string;
  /** A root directory to resolve relative path entries in the config file to. e.g. outDir */
  basePath?: string;
}

export function getProgram(options: TypescriptConfig = {}): ts.Program {
  const key = JSON.stringify(options);
  const cached = cache.get(key);

  if (cached) return cached;

  const configFile = ts.readJsonConfigFile(
    options.tsconfigPath ?? './tsconfig.json',
    (path) => ts.sys.readFile(path),
  );

  const parsed = ts.parseJsonSourceFileConfigFileContent(
    configFile,
    ts.sys,
    options.basePath ?? './',
  );

  const program = ts.createProgram({
    rootNames: options.files ?? parsed.fileNames,
    options: {
      ...parsed.options,
      incremental: false,
    },
  });

  cache.set(key, program);

  return program;
}
