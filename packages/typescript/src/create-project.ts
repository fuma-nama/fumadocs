import { Project } from 'ts-morph';

export interface TypescriptConfig {
  files?: string[];
  tsconfigPath?: string;
  /** A root directory to resolve relative path entries in the config file to. e.g. outDir */
  basePath?: string;
}

export function createProject(options: TypescriptConfig = {}): Project {
  return new Project({
    tsConfigFilePath: options.tsconfigPath ?? './tsconfig.json',
    skipAddingFilesFromTsConfig: true,
  });
}
