import ts from 'typescript';
import { type TypescriptConfig, getProgram, getFileSymbol } from '@/program';

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
  transform?: Transformer;
  type: ts.Type;
  symbol: ts.Symbol;
}

type Transformer = (
  this: EntryContext,
  entry: DocEntry,
  propertyType: ts.Type,
  propertySymbol: ts.Symbol,
) => void;

export interface GenerateOptions {
  /**
   * Allow fields with `@internal` tag
   *
   * @defaultValue false
   */
  allowInternal?: boolean;

  /**
   * Modify output property entry
   */
  transform?: Transformer;
}

export interface GenerateDocumentationOptions extends GenerateOptions {
  /**
   * Typescript configurations
   */
  config?:
    | TypescriptConfig
    | {
        program: ts.Program;
      };
}

/**
 * Generate documentation for properties in an exported type/interface
 */
export function generateDocumentation(
  file: string,
  name: string,
  options: GenerateDocumentationOptions = {},
): GeneratedDoc | undefined {
  const program =
    options.config && 'program' in options.config
      ? options.config.program
      : getProgram(options.config);
  const fileSymbol = getFileSymbol(file, program);
  if (!fileSymbol) return;

  const symbol = program
    .getTypeChecker()
    .getExportsOfModule(fileSymbol)
    .find((e) => e.getEscapedName().toString() === name);

  if (!symbol) return;

  return generate(program, symbol, options);
}

export function generate(
  program: ts.Program,
  symbol: ts.Symbol,
  { allowInternal = false, transform }: GenerateOptions,
): GeneratedDoc {
  const checker = program.getTypeChecker();
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  const entryContext: EntryContext = {
    checker,
    transform,
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
      .map((prop) => getDocEntry(prop, entryContext))
      .filter((entry) => allowInternal || !('internal' in entry.tags)),
  };
}

function getDocEntry(prop: ts.Symbol, context: EntryContext): DocEntry {
  const { checker, transform } = context;
  const subType = checker.getTypeOfSymbol(prop);
  const tags = Object.fromEntries(
    prop
      .getJsDocTags()
      .map((tag) => [tag.name, ts.displayPartsToString(tag.text)]),
  );

  let typeName = checker.typeToString(
    subType.getNonNullableType(),
    undefined,
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  );

  if (subType.aliasSymbol && !subType.aliasTypeArguments) {
    typeName = subType.aliasSymbol.escapedName.toString();
  }

  if (tags.remarks) {
    typeName = /^`(?<name>.+)`/.exec(tags.remarks)?.[1] ?? typeName;
  }

  const entry: DocEntry = {
    name: prop.getName(),
    description: ts.displayPartsToString(prop.getDocumentationComment(checker)),
    tags,
    type: typeName,
  };

  transform?.call(context, entry, subType, prop);

  return entry;
}
