import * as ts from 'typescript';
import { type TypescriptConfig, getProgram } from './program';

export interface GeneratedDoc {
  name: string;
  description: string;
  entries: DocEntry[];
}

export interface DocEntry {
  name: string;
  description: string;
  type: string;
  tags: Record<string, string>;
}

interface EntryContext {
  program: ts.Program;
  checker: ts.TypeChecker;
  options: GenerateOptions;
  type: ts.Type;
  symbol: ts.Symbol;
}

export interface GenerateOptions {
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

  /**
   * Typescript configurations
   */
  options?: TypescriptConfig;
}

/**
 * Generate documentation for properties in an exported type/interface
 */
export function generateDocumentation(
  options: GenerateOptions,
): GeneratedDoc | undefined {
  const program = getProgram(options.options);
  return generateDocumentationFromProgram(program, options);
}

export function generateDocumentationFromProgram(
  program: ts.Program,
  options: GenerateOptions,
): GeneratedDoc | undefined {
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(options.file);
  if (!sourceFile) return;

  const fileSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!fileSymbol) return;

  const symbol = checker
    .getExportsOfModule(fileSymbol)
    .find((e) => e.getEscapedName().toString() === options.name);

  if (!symbol) return;

  const type = checker.getDeclaredTypeOfSymbol(symbol);

  const entryContext: EntryContext = {
    checker,
    options,
    program,
    type,
    symbol,
  };

  return {
    name: symbol.getEscapedName().toString(),
    description: ts.displayPartsToString(
      symbol.getDocumentationComment(checker),
    ),
    entries: type
      .getProperties()
      .map((prop) => getDocEntry(prop, entryContext)),
  };
}

function getDocEntry(prop: ts.Symbol, context: EntryContext): DocEntry {
  const { checker, options } = context;
  const subType = checker.getTypeOfSymbol(prop);

  let typeName = checker.typeToString(
    subType.getNonNullableType(),
    undefined,
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  );

  if (subType.aliasSymbol && !subType.aliasTypeArguments) {
    typeName = subType.aliasSymbol.escapedName.toString();
  }

  const entry: DocEntry = {
    name: prop.getName(),
    description: ts.displayPartsToString(prop.getDocumentationComment(checker)),
    tags: Object.fromEntries(
      prop
        .getJsDocTags()
        .map((tag) => [tag.name, ts.displayPartsToString(tag.text)]),
    ),
    type: typeName,
  };

  options.transform?.call(context, entry, subType, prop);

  return entry;
}
