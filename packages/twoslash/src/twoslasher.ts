import {
  API,
  CompletionItemKind,
  NodeBuilderFlags,
  SignatureKind,
  SymbolFlags,
  TypeFormatFlags,
  type Checker,
  type CompilerOptions,
  type CreateSnapshotProgramParams,
  type Diagnostic,
  type Printer,
  type Project,
  type ReconfigureSnapshotProgramParams,
  type Signature,
  type Snapshot,
  type Symbol,
  type SyntheticProjectId,
  type Type,
} from 'typescript/sync';
import {
  NodeFlags,
  SyntaxKind,
  type CallExpression,
  type Expression,
  type Node,
  type NodeArray,
  type PropertyAccessExpression,
  type SourceFile,
} from 'typescript/ast';
import { createFileSystemLayer } from 'typescript/fs';
import {
  createPositionConverter,
  defaultHandbookOptions,
  findCutNotations,
  findFlagNotations,
  findQueryMarkers,
  isInRange,
  isInRanges,
  removeCodeRanges,
  resolveNodePositions,
  splitFiles,
  TwoslashError,
  validateCodeForErrors,
  type CompletionEntry,
  type HandbookOptions,
  type NodeError,
  type NodeHover,
  type NodeWithoutPosition,
  type Notations,
  type PositionConverter,
  type TwoslashNode,
  type VirtualFile,
} from './notations';
import path from 'node:path';

export type ExtraFiles = Record<string, string | { prepend?: string; append?: string }>;

export interface TwoslasherOptions {
  /**
   * Code blocks are analyzed as in-memory files in the `.twoslash` directory of it, modules are resolved from there.
   *
   * @defaultValue process.cwd()
   */
  cwd?: string;
  /**
   * Compiler options in `tsconfig.json` form.
   */
  compilerOptions?: Record<string, unknown>;
  handbookOptions?: Partial<HandbookOptions>;
  /**
   * `// @[tag]` notations to display as custom tags, instead of compiler flags
   *
   * @defaultValue ['annotate', 'log', 'warn', 'error']
   */
  customTags?: string[];
  /**
   * A custom hook to filter out hover info for certain identifiers
   */
  shouldGetHoverInfo?: (identifier: string, start: number, filename: string) => boolean;
  /**
   * A custom predicate to filter out nodes for further processing
   */
  filterNode?: (node: NodeWithoutPosition) => boolean;
  /**
   * Extra files to be added next to the code block, or prepended/appended to existing files
   */
  extraFiles?: ExtraFiles;
}

export interface TwoslashReturn {
  /** the code with notations removed */
  code: string;
  nodes: TwoslashNode[];
}

export interface Twoslasher {
  (code: string, extension?: string): TwoslashReturn;
  /**
   * Analyze the code block together with other blocks prepared in the same tick, in one snapshot of the TypeScript project.
   *
   * The result is returned by the following synchronous call with the same code.
   */
  prepare(code: string, extension?: string): Promise<void>;
}

const defaultCompilerOptions = {
  strict: true,
  module: 'esnext',
  target: 'esnext',
  moduleResolution: 'bundler',
  moduleDetection: 'force',
  jsx: 'react-jsx',
  esModuleInterop: true,
  allowJs: true,
  skipLibCheck: true,
};

const supportedExtensions = ['ts', 'tsx', 'js', 'jsx'];
/** the time to wait for other code blocks to join a batch */
const batchDelay = 10;
/** also used as node builder flags, which share the values */
const typeFlags =
  TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | TypeFormatFlags.MultilineObjectLiterals;
/** longer types are truncated by the checker */
const maxTypeLength = 500;

const completionKinds: Partial<Record<CompletionItemKind, string>> = {
  [CompletionItemKind.Method]: 'method',
  [CompletionItemKind.Function]: 'function',
  [CompletionItemKind.Constructor]: 'constructor',
  [CompletionItemKind.Field]: 'property',
  [CompletionItemKind.Property]: 'property',
  [CompletionItemKind.Class]: 'class',
  [CompletionItemKind.Interface]: 'interface',
  [CompletionItemKind.Module]: 'module',
  [CompletionItemKind.Constant]: 'string',
};

interface Identifier {
  node: Node;
  /** position in the file */
  pos: number;
  text: string;
}

function getIdentifiers(sourceFile: SourceFile): Identifier[] {
  const out: Identifier[] = [];
  function walk(node: Node) {
    node.forEachChild((child) => {
      // missing identifiers are parsed as empty ones
      if (child.kind === SyntaxKind.Identifier && child.end > child.pos) {
        const pos = child.getStart();
        out.push({ node: child, pos, text: sourceFile.text.slice(pos, child.end) });
      }
      walk(child);
    });
  }
  walk(sourceFile);
  return out;
}

function flattenDiagnostic(diagnostic: Diagnostic, indent = 0): string {
  let text = '  '.repeat(indent) + diagnostic.text;
  for (const chain of diagnostic.messageChain ?? []) {
    text += `\n${flattenDiagnostic(chain, indent + 1)}`;
  }
  return text;
}

function qualifiedName(symbol: Symbol): string {
  const parent = symbol.getParent();
  const optional = symbol.flags & SymbolFlags.Optional ? '?' : '';
  // skip synthetic parents such as `__object` and `__type`
  if (!parent || parent.name.startsWith('__')) return symbol.name + optional;
  return `${parent.name}.${symbol.name}${optional}`;
}

function variableKeyword(symbol: Symbol): string {
  // binding elements in destructuring are nested in the parameter or variable declaration
  let declaration: Node | undefined = symbol.valueDeclaration?.resolve();
  while (
    declaration &&
    declaration.kind !== SyntaxKind.Parameter &&
    declaration.kind !== SyntaxKind.VariableDeclaration
  ) {
    declaration = declaration.parent;
  }
  if (!declaration) return 'var';
  if (declaration.kind === SyntaxKind.Parameter) return '(parameter)';
  const flags = declaration.parent.flags;
  if (flags & NodeFlags.Const) return 'const';
  if (flags & NodeFlags.Let) return 'let';
  if (flags & NodeFlags.Using) return 'using';
  return 'var';
}

/**
 * The call expression the identifier is invoking, if any
 */
function getCall(node: Node): CallExpression | undefined {
  let callee = node;
  const parent = node.parent as PropertyAccessExpression;
  if (parent.kind === SyntaxKind.PropertyAccessExpression && parent.name === node) callee = parent;
  const call = callee.parent as CallExpression;
  const isCall = call.kind === SyntaxKind.CallExpression || call.kind === SyntaxKind.NewExpression;
  return isCall && call.expression === callee ? call : undefined;
}

/**
 * The object literal the identifier is a key of, if any
 */
function getObjectLiteral(node: Node): Expression | undefined {
  const parent = node.parent as { name?: Node; parent: Node };
  const isKey =
    parent.name === node &&
    (parent.parent.kind === SyntaxKind.ObjectLiteralExpression ||
      parent.parent.kind === SyntaxKind.JsxAttributes);
  return isKey ? (parent.parent as Expression) : undefined;
}

function printType(
  checker: Checker,
  printer: Printer,
  type: Type,
  location?: Node,
  flags = typeFlags,
): string {
  const text = checker.typeToString(type, location, flags | TypeFormatFlags.NoTruncation);
  if (text.length <= maxTypeLength) return text;
  // `typeToString` cuts truncated types at 320 characters
  const node = checker.typeToTypeNode(type, location, flags | NodeBuilderFlags.IgnoreErrors);
  return node ? printer.printNode(node) : text;
}

function printSignature(
  checker: Checker,
  printer: Printer,
  signature: Signature,
  location: Node,
): string | undefined {
  const print = (flags: number) => {
    const node = checker.signatureToSignatureDeclaration(
      signature,
      SyntaxKind.MethodSignature,
      location,
      flags | NodeBuilderFlags.IgnoreErrors,
    );
    return node && printer.printNode(node);
  };
  const text = print(typeFlags | NodeBuilderFlags.NoTruncation);
  return text && text.length > maxTypeLength ? print(typeFlags) : text;
}

/**
 * Approximate the display string of quick info, the TypeScript API doesn't provide it.
 */
function describeSymbol(
  checker: Checker,
  printer: Printer,
  symbol: Symbol,
  type: Type,
  identifier: Identifier,
  call: CallExpression | undefined,
  typeToString: (type: Type) => string,
): string {
  const { flags } = symbol;
  const { node } = identifier;
  const name = symbol.name === 'default' ? identifier.text : symbol.name;

  if (flags & SymbolFlags.Variable)
    return `${variableKeyword(symbol)} ${name}: ${typeToString(type)}`;

  if (flags & (SymbolFlags.Function | SymbolFlags.Method)) {
    const signatures = checker.getSignaturesOfType(type, SignatureKind.Call);
    const resolved = call && checker.getResolvedSignature(call);
    const signature = resolved && !checker.isUnknownSignature(resolved) ? resolved : signatures[0];
    const printed = signature && printSignature(checker, printer, signature, node);

    if (printed) {
      const head =
        flags & SymbolFlags.Method ? `(method) ${qualifiedName(symbol)}` : `function ${name}`;
      const overloads = signatures.length - 1;
      let text = head + printed.replace(/;$/, '');
      if (overloads > 0) text += ` (+${overloads} overload${overloads > 1 ? 's' : ''})`;
      return text;
    }
  }

  if (flags & SymbolFlags.Enum) return `enum ${name}`;
  if (flags & SymbolFlags.Module) {
    // file modules are only displayed by their import
    if (symbol.declarations[0]?.kind === SyntaxKind.SourceFile) return '';
    return `${name.startsWith('"') ? 'module' : 'namespace'} ${name}`;
  }

  if (flags & (SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.TypeAlias)) {
    const declaration = symbol.declarations[0]?.resolve() as { typeParameters?: NodeArray<Node> };
    let text = name;
    if (declaration?.typeParameters?.length) {
      text += `<${declaration.typeParameters.map((param) => printer.printNode(param)).join(', ')}>`;
    }

    if (flags & SymbolFlags.Class) return `class ${text}`;
    if (flags & SymbolFlags.Interface) return `interface ${text}`;
    const declared = checker.getDeclaredTypeOfSymbol(symbol);
    return `type ${text} = ${printType(checker, printer, declared, node, typeFlags | TypeFormatFlags.InTypeAlias)}`;
  }
  if (flags & SymbolFlags.TypeParameter) return `(type parameter) ${name}`;

  let head: string;
  if (flags & (SymbolFlags.Property | SymbolFlags.Accessor))
    head = `(property) ${qualifiedName(symbol)}`;
  else if (flags & SymbolFlags.EnumMember) {
    head = `(enum member) ${qualifiedName(symbol)}`;
    if (type.isLiteralType()) return `${head} = ${JSON.stringify(type.value)}`;
  } else head = name;

  return `${head}: ${typeToString(type)}`;
}

/** a set of compiler options, and the program of blocks using it */
interface Config {
  options: CompilerOptions;
  errors: Diagnostic[];
  id?: SyntheticProjectId;
}

interface Block {
  key: string;
  /** number of calls waiting for the result */
  refs: number;
  code: string;
  config: Config;
  notations: Notations;
  /** files of the code block supported by the compiler */
  files: VirtualFile[];
  /** files outside of the code block */
  extraFiles: [filename: string, content: string][];
  pc: PositionConverter;
}

export function createTwoslasher(options: TwoslasherOptions = {}): Twoslasher {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const root = `${path.join(cwd, '.twoslash').replaceAll('\\', '/')}/`;
  /** configs by compiler options in `tsconfig.json` form */
  const configs = new Map<string, Config>();
  /** content of the files in the last batch */
  let files = new Map<string, string>();
  const results = new Map<string, { refs: number; value?: TwoslashReturn; error?: unknown }>();
  const pending = new Map<string, Block>();
  let scheduled: Promise<void> | undefined;
  let api: API | undefined;
  let snapshot: Snapshot | undefined;

  /** directory of the block at `index` of a batch, the block is placed in a stable slot to keep the root files unchanged */
  const slot = (index: number) => `${root}${index}/`;

  function parse(code: string, extension: string): Block {
    const { customTags = ['annotate', 'log', 'warn', 'error'], extraFiles = {} } = options;
    const notations: Notations = {
      compilerOptions: { ...defaultCompilerOptions, ...options.compilerOptions },
      handbookOptions: { ...defaultHandbookOptions, ...options.handbookOptions },
      tags: [],
      removals: [],
      queries: [],
      completions: [],
      highlights: [],
    };
    findFlagNotations(code, customTags, notations);
    findCutNotations(code, notations.removals);
    const pc = createPositionConverter(code);
    findQueryMarkers(code, pc, notations);

    const compilerOptions = JSON.stringify(notations.compilerOptions);
    let config = configs.get(compilerOptions);
    if (!config) {
      api ??= new API({ cwd });
      // `files` keeps cwd from being globbed, its emptiness is reported as error 18002
      const parsed = api.parseJsonConfigFileContent(
        { compilerOptions: notations.compilerOptions, files: [] },
        { configDirectory: cwd },
      );
      config = {
        options: parsed.options,
        errors: parsed.errors.filter((error) => error.code !== 18002),
      };
      configs.set(compilerOptions, config);
    }
    if (config.errors.length > 0 && !notations.handbookOptions.noErrorValidation) {
      throw new TwoslashError(
        'Invalid compiler options',
        config.errors.map((d) => d.text).join('\n'),
        'Check the inline compiler flags in the code block.',
      );
    }

    const files = splitFiles(code, `index.${extension}`).filter(
      (file) =>
        supportedExtensions.includes(file.extension) ||
        (file.extension === 'json' && !!notations.compilerOptions.resolveJsonModule),
    );
    for (const file of files) {
      // it could shadow a project file, which a later batch would hide by removing it
      if (file.filename.split(/[/\\]/).includes('..')) {
        throw new TwoslashError(
          'Invalid filename',
          `${file.filename} is outside of the code block directory.`,
        );
      }
    }
    const extra: Block['extraFiles'] = [];
    for (const [filename, value] of Object.entries(extraFiles)) {
      const file = files.find((file) => file.filename === filename);
      if (!file) {
        const content =
          typeof value === 'string' ? value : (value.prepend ?? '') + (value.append ?? '');
        extra.push([filename, content]);
      } else if (typeof value !== 'string') {
        Object.assign(file, value);
      }
    }

    return {
      key: getKey(code, extension),
      refs: 1,
      code,
      config,
      notations,
      files,
      extraFiles: extra,
      pc,
    };
  }

  /**
   * Load the blocks into the programs of their configs, in one snapshot
   */
  function open(blocks: Block[]): Snapshot {
    const next = new Map<string, string>();
    const roots = new Map<Config, string[]>();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const dir = slot(i);
      const rootFiles = roots.get(block.config) ?? [];
      roots.set(block.config, rootFiles);
      for (const file of block.files) {
        // the layer rejects two spellings of a path, like `./index.ts` and `index.ts`
        const filePath = path.posix.join(dir, file.filename);
        next.set(filePath, (file.prepend ?? '') + file.content + (file.append ?? ''));
        rootFiles.push(filePath);
      }
      for (const [filename, content] of block.extraFiles) {
        const filePath = path.posix.join(dir, filename);
        next.set(filePath, content);
        rootFiles.push(filePath);
      }
    }

    const changed: [string, string][] = [];
    for (const [file, content] of next) {
      if (files.get(file) !== content) changed.push([file, content]);
    }
    // stale files of previous blocks must not be imported
    const removedPaths: string[] = [];
    for (const file of files.keys()) {
      if (!next.has(file)) removedPaths.push(file);
    }
    const createPrograms: CreateSnapshotProgramParams[] = [];
    const reconfigurePrograms: ReconfigureSnapshotProgramParams[] = [];
    for (const [config, rootFiles] of roots) {
      const { id, options: compilerOptions } = config;
      if (id) reconfigurePrograms.push({ id, rootFiles, compilerOptions });
      else createPrograms.push({ rootFiles, compilerOptions });
    }

    snapshot ??= api!.createSnapshot({
      userPreferences: { includeCompletionsForModuleExports: false },
    });
    const updated = snapshot.update({
      fileSystem: createFileSystemLayer(changed, { removedPaths }),
      createPrograms,
      reconfigurePrograms,
    });
    // configs without a program are in the order of `createPrograms`
    const created = updated.operation.createdPrograms;
    let index = 0;
    for (const config of roots.keys()) config.id ??= created[index++].id;
    snapshot.dispose();
    snapshot = updated;
    files = next;
    return snapshot;
  }

  function run(blocks: Block[]) {
    const snapshot = open(blocks);
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      try {
        const project = snapshot.getProject(block.config.id!)!;
        const value = analyze(block, project, api!.printer, slot(i), options);
        results.set(block.key, { refs: block.refs, value });
      } catch (error) {
        results.set(block.key, { refs: block.refs, error });
      }
    }
  }

  function twoslasher(code: string, extension = 'ts'): TwoslashReturn {
    const key = getKey(code, extension);
    let result = results.get(key);
    if (!result) {
      run([pending.get(key) ?? parse(code, extension)]);
      pending.delete(key);
      result = results.get(key)!;
    }
    if (--result.refs <= 0) results.delete(key);
    if (result.value) return result.value;
    throw result.error;
  }

  twoslasher.prepare = (code: string, extension = 'ts'): Promise<void> => {
    const key = getKey(code, extension);
    const result = results.get(key);
    if (result) {
      result.refs++;
      return Promise.resolve();
    }
    const block = pending.get(key);
    if (block) {
      block.refs++;
    } else {
      try {
        pending.set(key, parse(code, extension));
      } catch (error) {
        results.set(key, { refs: 1, error });
        return Promise.resolve();
      }
    }

    return (scheduled ??= new Promise((resolve, reject) => {
      // collect the blocks of documents being compiled concurrently
      setTimeout(() => {
        const blocks = Array.from(pending.values());
        pending.clear();
        scheduled = undefined;
        try {
          run(blocks);
          resolve();
        } catch (error) {
          reject(error as Error);
        }
      }, batchDelay);
    }));
  };

  return twoslasher;
}

function getKey(code: string, extension: string): string {
  return `${extension}\0${code}`;
}

function analyze(
  block: Block,
  project: Project,
  printer: Printer,
  dir: string,
  { shouldGetHoverInfo, filterNode }: TwoslasherOptions,
): TwoslashReturn {
  const { code, notations, pc } = block;
  const { handbookOptions, removals } = notations;
  let nodes: NodeWithoutPosition[] = [...notations.tags];
  const isInRemoval = (index: number) =>
    index >= code.length || index < 0 || isInRanges(index, removals, false);

  const { checker, program, languageService } = project;

  const identifiersMap = new Map<VirtualFile, Identifier[]>();
  function getIdentifiersOfFile(file: VirtualFile): Identifier[] {
    let identifiers = identifiersMap.get(file);
    if (!identifiers) {
      const sourceFile = program.getSourceFile(dir + file.filename);
      identifiers = sourceFile ? getIdentifiers(sourceFile) : [];
      identifiersMap.set(file, identifiers);
    }
    return identifiers;
  }
  function getFileAtPosition(pos: number): VirtualFile | undefined {
    return block.files.find((i) => isInRange(pos, [i.offset, i.offset + i.content.length]));
  }
  /** position in the file -> position in the code block */
  function toCode(file: VirtualFile, position: number): number {
    return position - (file.prepend?.length ?? 0) + file.offset;
  }
  /** position in the code block -> position in the file */
  function toFile(file: VirtualFile, position: number): number {
    return position - file.offset + (file.prepend?.length ?? 0);
  }

  const typeStrings = new Map<number, string>();
  function typeToString(type: Type): string {
    let text = typeStrings.get(type.id);
    if (text === undefined) {
      text = printType(checker, printer, type);
      typeStrings.set(type.id, text);
    }
    return text;
  }

  const described = new Map<string, string>();
  const symbolDocs = new Map<number, Pick<NodeHover, 'docs' | 'tags'>>();
  function getHover(
    file: VirtualFile,
    identifier: Identifier,
    symbol: Symbol,
    type: Type,
  ): NodeWithoutPosition<NodeHover> {
    const { node } = identifier;
    let target = symbol;
    if (symbol.flags & SymbolFlags.Alias) {
      target = checker.getAliasedSymbol(symbol);
    } else {
      // keys of object literals should display the property of contextual type, it contains the docs
      const literal = getObjectLiteral(node);
      let contextual = literal && checker.getContextualType(literal);
      if (contextual) contextual = checker.getNonNullableType(contextual);
      const property = contextual && checker.getPropertyOfType(contextual, symbol.name);
      // for unions, only properties shared by all members are meaningful
      if (
        contextual &&
        property &&
        (!contextual.isUnionType() || property.declarations.length === 1)
      ) {
        target = property;
        type = checker.getTypeOfSymbol(property);
      }
    }

    const call = getCall(node);
    // a call displays its own resolved signature, so each call site gets its own entry
    const key = `${target.id}:${type.id}:${call ? call.pos : -1}`;
    let text = described.get(key);
    if (text === undefined) {
      text = describeSymbol(checker, printer, target, type, identifier, call, typeToString);
      described.set(key, text);
    }
    if (symbol.flags & SymbolFlags.Alias) {
      // call sites display the resolved signature without keyword
      if (call) text = text.replace(/^function /, '');
      text = text ? `(alias) ${text}\nimport ${symbol.name}` : `import ${symbol.name}`;
    }

    let docs = symbolDocs.get(target.id);
    if (!docs) {
      const tags = checker.getJsDocTagsOfSymbol(target);
      docs = {
        docs: checker.getDocumentationCommentOfSymbol(target) || undefined,
        tags: tags.length > 0 ? tags.map((tag) => [tag.name, tag.text]) : undefined,
      };
      symbolDocs.set(target.id, docs);
    }

    const { text: name } = identifier;
    const start = toCode(file, identifier.pos);
    return { type: 'hover', text, ...docs, start, length: name.length, target: name };
  }

  /**
   * Resolve symbols & types of identifiers in one batch
   */
  function getHovers(file: VirtualFile, identifiers: Identifier[]) {
    const positions: number[] = [];
    const nodes: Node[] = [];
    for (const identifier of identifiers) {
      positions.push(identifier.pos);
      nodes.push(identifier.node);
    }
    const symbols = checker.getSymbolAtPosition(dir + file.filename, positions);
    const types = checker.getTypeAtLocation(nodes);
    const out: NodeWithoutPosition<NodeHover>[] = [];
    for (let i = 0; i < identifiers.length; i++) {
      const symbol = symbols[i];
      if (symbol) out.push(getHover(file, identifiers[i], symbol, types[i]));
    }
    return out;
  }

  if (!handbookOptions.noStaticSemanticInfo) {
    for (const file of block.files) {
      const identifiers: Identifier[] = [];
      for (const identifier of getIdentifiersOfFile(file)) {
        const start = toCode(file, identifier.pos);
        if (isInRemoval(start)) continue;
        if (shouldGetHoverInfo && !shouldGetHoverInfo(identifier.text, start, file.filename))
          continue;
        identifiers.push(identifier);
      }
      nodes.push(...getHovers(file, identifiers));
    }
  }

  for (const query of notations.queries) {
    const file = getFileAtPosition(query);
    if (isInRemoval(query) || !file) {
      throw new TwoslashError(
        'Invalid quick info query',
        `The request on line ${pc.indexToPos(query).line + 2} for quickinfo via ^? is in a removal range.`,
        'This is likely that the positioning is off.',
      );
    }
    const identifier = getIdentifiersOfFile(file).find((identifier) => {
      const start = toCode(file, identifier.pos);
      return isInRange(query, [start, start + identifier.text.length]);
    });
    const hover = identifier ? getHovers(file, [identifier])[0] : undefined;
    if (!hover) {
      throw new TwoslashError(
        'Invalid quick info query',
        `The request on line ${pc.indexToPos(query).line + 2} in ${file.filename} for quickinfo via ^? returned nothing from the compiler.`,
        'This is likely that the positioning is off.',
      );
    }
    nodes.push({ ...hover, type: 'query' });
  }

  for (const [start, end, text] of notations.highlights) {
    nodes.push({ type: 'highlight', start, length: end - start, text });
  }

  for (const target of notations.completions) {
    const file = getFileAtPosition(target);
    if (isInRemoval(target) || !file) {
      throw new TwoslashError(
        'Invalid completion query',
        `The request on line ${pc.indexToPos(target).line + 2} for completions via ^| is in a removal range.`,
        'This is likely that the positioning is off.',
      );
    }

    const prefix = /[$\w]+$/.exec(code.slice(0, target))?.[0] ?? '';
    const result = languageService.getCompletionsAtPosition(
      dir + file.filename,
      toFile(file, target),
    );
    const completions: CompletionEntry[] = [];
    for (const entry of result?.entries ?? []) {
      if (!entry.name.startsWith(prefix)) continue;
      completions.push({ name: entry.name, kind: entry.kind && completionKinds[entry.kind] });
    }
    if (completions.length === 0 && !handbookOptions.noErrorValidation) {
      throw new TwoslashError(
        'Invalid completion query',
        `The request on line ${pc.indexToPos(target).line + 2} in ${file.filename} for completions via ^| returned no completions from the compiler. (prefix: ${prefix})`,
        'This is likely that the positioning is off.',
      );
    }
    nodes.push({
      type: 'completion',
      start: target,
      length: 0,
      completions,
      completionsPrefix: prefix,
    });
  }

  let errorNodes: NodeWithoutPosition<NodeError>[] = [];
  const { noErrors, noErrorsCutted } = handbookOptions;
  if (noErrors !== true) {
    const ignores = Array.isArray(noErrors) ? noErrors : [];
    function addErrors(file: VirtualFile, diagnostics: readonly Diagnostic[]) {
      for (const diagnostic of diagnostics) {
        if (ignores.includes(diagnostic.code)) continue;
        const start = toCode(file, diagnostic.pos);
        if (noErrorsCutted && isInRemoval(start)) continue;
        errorNodes.push({
          type: 'error',
          start,
          length: diagnostic.end - diagnostic.pos,
          code: diagnostic.code,
          filename: file.filename,
          text: flattenDiagnostic(diagnostic),
          level: (['warning', 'error', 'suggestion', 'message'] as const)[diagnostic.category],
        });
      }
    }
    for (const file of block.files) {
      const filepath = dir + file.filename;
      addErrors(file, program.getSemanticDiagnostics(filepath));
      addErrors(file, program.getSyntacticDiagnostics(filepath));
    }
  }
  if (filterNode) {
    nodes = nodes.filter(filterNode);
    errorNodes = errorNodes.filter(filterNode);
  }
  nodes.push(...errorNodes);
  if (!handbookOptions.noErrorValidation) validateCodeForErrors(errorNodes, handbookOptions);

  let outputCode = code;
  if (!handbookOptions.keepNotations) {
    ({ code: outputCode, nodes } = removeCodeRanges(code, removals, nodes));
  }
  const outputPc = outputCode === code ? pc : createPositionConverter(outputCode);
  return { code: outputCode, nodes: resolveNodePositions(nodes, outputPc) };
}
