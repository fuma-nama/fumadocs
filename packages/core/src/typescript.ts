import * as ts from 'typescript';

export interface DocEntry {
  name: string;
  description: string;
  type: string;
  default?: string;
}

interface Context {
  program: ts.Program;
  checker: ts.TypeChecker;
  options: Options;
}

interface EntryContext extends Context {
  type: ts.Type;
  symbol: ts.Symbol;
}

export interface Options {
  file: string;
  name: string;
  /**
   * Modify output property entry
   */
  transform?: (
    this: EntryContext,
    entry: DocEntry,
    propertyType: ts.Type,
    propertySymbol: ts.Symbol,
  ) => void;
  options?: Partial<{
    files: string[];
    tsconfigPath: string;
    /** A root directory to resolve relative path entries in the config file to. e.g. outDir */
    basePath: string;
  }>;
}

const cache = new Map<string, ts.Program>();

function getProgram(options: Options['options'] = {}): ts.Program {
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

function getExportedSymbol({
  options: { file, name },
  checker,
  program,
}: Context): ts.Symbol | undefined {
  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) return;

  const fileSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!fileSymbol) return;

  const exports = checker.getExportsOfModule(fileSymbol);
  return exports.find((e) => e.getEscapedName().toString() === name);
}

/**
 * Generate documentation for properties in an exported type/interface
 */
export function generateDocumentation(options: Options): DocEntry[] {
  const program = getProgram(options.options);
  const checker = program.getTypeChecker();
  const ctx: Context = {
    checker,
    program,
    options,
  };

  const symbol = getExportedSymbol(ctx);
  if (!symbol) return [];

  const type = checker.getDeclaredTypeOfSymbol(symbol);

  const entryContext: EntryContext = {
    ...ctx,
    type,
    symbol,
  };

  return type.getProperties().map(getDocEntry.bind(entryContext));
}

function getDocEntry(this: EntryContext, prop: ts.Symbol): DocEntry {
  const subType = this.checker.getTypeOfSymbol(prop);

  const defaultJsDocTag = prop
    .getJsDocTags()
    .find((info) => ['default', 'defaultValue'].includes(info.name));

  let typeName = this.checker.typeToString(
    subType.getNonNullableType(),
    undefined,
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  );

  if (subType.aliasSymbol && !subType.aliasTypeArguments) {
    typeName = subType.aliasSymbol.escapedName.toString();
  }

  const entry: DocEntry = {
    name: prop.getName(),
    description: ts.displayPartsToString(
      prop.getDocumentationComment(this.checker),
    ),
    default: defaultJsDocTag?.text
      ? ts.displayPartsToString(defaultJsDocTag.text)
      : undefined,
    type: typeName,
  };

  this.options.transform?.call(this, entry, subType, prop);

  return entry;
}
