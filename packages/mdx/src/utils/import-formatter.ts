import path from 'node:path';

export type ImportPathConfig = ({ relativeTo: string } | { absolute: true }) & {
  jsExtension?: boolean;
};

export function toImportPath(file: string, config: ImportPathConfig): string {
  const ext = path.extname(file);
  let filename: string;

  if (ext === '.ts' && config.jsExtension) {
    filename = file.substring(0, file.length - ext.length) + '.js';
  } else if (ext === '.ts') {
    filename = file.substring(0, file.length - ext.length);
  } else {
    filename = file;
  }

  let importPath;
  if ('relativeTo' in config) {
    importPath = path.relative(config.relativeTo, filename);

    if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
      importPath = `./${importPath}`;
    }
  } else {
    importPath = path.resolve(filename);
  }

  return importPath.replaceAll(path.sep, '/');
}

export function ident(code: string, tab: number = 1) {
  return code
    .split('\n')
    .map((v) => '  '.repeat(tab) + v)
    .join('\n');
}
