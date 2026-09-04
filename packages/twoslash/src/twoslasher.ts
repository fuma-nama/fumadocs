import {
  API,
  CompletionItemKind,
  NodeBuilderFlags,
  SignatureKind,
  SymbolFlags,
  type Diagnostic,
  type Project,
  type Snapshot,
  type Symbol,
  type Type,
} from 'typescript/unstable/sync';
import {
  NodeFlags,
  SyntaxKind,
  type CallExpression,
  type Expression,
  type Node,
  type NodeArray,
  type PropertyAccessExpression,
  type SourceFile,
} from 'typescript/unstable/ast';
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
  type HandbookOptions,
  type NodeCompletion,
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

export interface TwoslashExecuteOptions {
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
   * Extra files to be added to the virtual file system, or prepended/appended to existing files
   */
  extraFiles?: ExtraFiles;
  /**
   * Positions of `^?` queries, in addition to the notations in the code
   */
  positionQueries?: number[];
  /**
   * Positions of `^|` completions, in addition to the notations in the code
   */
  positionCompletions?: number[];
  /**
   * Ranges of `^^^` highlights, in addition to the notations in the code
   */
  positionHighlights?: [start: number, end: number, text?: string][];
}

export interface TwoslasherOptions extends TwoslashExecuteOptions {
  /**
   * Code blocks are virtually placed in the `.twoslash` directory of it, modules are resolved from there.
   *
   * @defaultValue process.cwd()
   */
  cwd?: string;
}

export interface TwoslashReturn {
  /** the code with notations removed */
  code: string;
  nodes: TwoslashNode[];
}

export interface Twoslasher {
  (code: string, extension?: string, options?: TwoslashExecuteOptions): TwoslashReturn;
  /**
   * Analyze the code block together with other blocks prepared in the same tick, in one snapshot of the TypeScript project.
   *
   * The result is returned by the following synchronous call with the same code.
   */
  prepare(code: string, extension?: string, options?: TwoslashExecuteOptions): Promise<void>;
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
const completionTriggers = ['.', '"', "'", '`', '/', '@', '<', '#', ' '];
const typeFlags =
  NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope |
  NodeBuilderFlags.MultilineObjectLiterals |
  NodeBuilderFlags.NoTruncation;

const completionKinds: Partial<Record<CompletionItemKind, string>> = {
  [CompletionItemKind.Method]: 'method',
  [CompletionItemKind.Function]: 'function',
  [CompletionItemKind.Constructor]: 'constructor',
  [CompletionItemKind.Field]: 'property',
  [CompletionItemKind.Property]: 'property',
  [CompletionItemKind.Class]: 'class',
  [CompletionItemKind.Interface]: 'interface',
  [CompletionItemKind.Module]: 'module',
};

function normalizePath(p: string): string {
  let out = path.resolve(p).replaceAll('\\', '/');
  if (process.platform === 'win32' && /^[A-Z]:/.test(out)) {
    out = out[0].toLowerCase() + out.slice(1);
  }
  return out;
}

function getIdentifiers(sourceFile: SourceFile): Node[] {
  const out: Node[] = [];
  function walk(node: Node) {
    node.forEachChild((child) => {
      if (child.kind === SyntaxKind.Identifier) out.push(child);
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
  let declaration = symbol.valueDeclaration?.resolve();
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

/**
 * Approximate the display string of quick info, TypeScript 7 doesn't provide a language service.
 */
function describeSymbol(
  project: Project,
  symbol: Symbol,
  type: Type,
  node: Node,
  typeToString: (type: Type) => string,
): string {
  const { checker, emitter } = project;
  const { flags } = symbol;
  const name = symbol.name === 'default' ? node.getText() : symbol.name;

  if (flags & SymbolFlags.Variable)
    return `${variableKeyword(symbol)} ${name}: ${typeToString(type)}`;

  if (flags & (SymbolFlags.Function | SymbolFlags.Method)) {
    const signatures = checker.getSignaturesOfType(type, SignatureKind.Call);
    const call = getCall(node);
    const signature = (call && checker.getResolvedSignature(call)) ?? signatures[0];
    const declaration =
      signature &&
      checker.signatureToSignatureDeclaration(
        signature,
        SyntaxKind.MethodSignature,
        node,
        typeFlags,
      );

    if (declaration) {
      const head =
        flags & SymbolFlags.Method ? `(method) ${qualifiedName(symbol)}` : `function ${name}`;
      const overloads = signatures.length - 1;
      let text = head + emitter.printNode(declaration).replace(/;$/, '');
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
      text += `<${declaration.typeParameters.map((param) => emitter.printNode(param)).join(', ')}>`;
    }

    if (flags & SymbolFlags.Class) return `class ${text}`;
    if (flags & SymbolFlags.Interface) return `interface ${text}`;
    const declared = checker.getDeclaredTypeOfSymbol(symbol);
    return `type ${text} = ${checker.typeToString(declared, node, typeFlags | NodeBuilderFlags.InTypeAlias)}`;
  }
  if (flags & SymbolFlags.TypeParameter) return `(type parameter) ${name}`;

  let head: string;
  if (flags & (SymbolFlags.Property | SymbolFlags.Accessor))
    head = `(property) ${qualifiedName(symbol)}`;
  else if (flags & SymbolFlags.EnumMember) head = `(enum member) ${qualifiedName(symbol)}`;
  else head = name;

  return `${head}: ${typeToString(type)}`;
}

interface Block {
  key: string;
  /** number of calls waiting for the result */
  refs: number;
  code: string;
  /** directory of virtual files */
  dir: string;
  configPath: string;
  notations: Notations;
  files: VirtualFile[];
  pc: PositionConverter;
  options: TwoslashExecuteOptions;
}

export function createTwoslasher(options: TwoslasherOptions = {}): Twoslasher {
  const root = `${normalizePath(options.cwd ?? process.cwd())}/.twoslash/`;
  /** virtual files, replaced on every batch */
  const files = new Map<string, string>();
  /** config file path of each compiler options */
  const configPaths = new Map<string, string>();
  let openedProjects = new Set<string>();
  const results = new Map<string, { refs: number; value?: TwoslashReturn; error?: unknown }>();
  const pending = new Map<string, Block>();
  let scheduled: Promise<void> | undefined;
  let api: API | undefined;
  let snapshot: Snapshot | undefined;
  let nextId = 0;

  function parse(code: string, extension: string, executeOptions: TwoslashExecuteOptions): Block {
    const { customTags = ['annotate', 'log', 'warn', 'error'], extraFiles = {} } = executeOptions;
    const notations: Notations = {
      compilerOptions: {
        ...defaultCompilerOptions,
        ...options.compilerOptions,
        ...executeOptions.compilerOptions,
      },
      handbookOptions: {
        ...defaultHandbookOptions,
        ...options.handbookOptions,
        ...executeOptions.handbookOptions,
      },
      tags: [],
      removals: [],
      queries: [...(executeOptions.positionQueries ?? [])],
      completions: [...(executeOptions.positionCompletions ?? [])],
      highlights: [...(executeOptions.positionHighlights ?? [])],
    };
    findFlagNotations(code, customTags, notations);
    findCutNotations(code, notations.removals);
    const pc = createPositionConverter(code);
    findQueryMarkers(code, pc, notations);
    if (notations.handbookOptions.showEmit) {
      throw new TwoslashError(
        'Option `showEmit` is not supported',
        'TypeScript 7 does not provide an API to emit JavaScript.',
      );
    }

    const dir = `${root}${nextId++}/`;
    const compilerOptions = JSON.stringify(notations.compilerOptions);
    let configPath = configPaths.get(compilerOptions);
    if (!configPath) {
      configPath = `${root}tsconfig.${configPaths.size}.json`;
      configPaths.set(compilerOptions, configPath);
    }

    const files = splitFiles(code, `index.${extension}`, dir).filter(
      (file) =>
        supportedExtensions.includes(file.extension) ||
        (file.extension === 'json' && !!notations.compilerOptions.resolveJsonModule),
    );
    for (const [filename, extra] of Object.entries(extraFiles)) {
      const file = files.find((file) => file.filename === filename);
      if (file) {
        if (typeof extra !== 'string') Object.assign(file, extra);
        continue;
      }
      files.push({
        // not in the code block
        offset: code.length,
        filename,
        filepath: dir + filename,
        content: '',
        extension: filename.slice(filename.lastIndexOf('.') + 1),
        ...(typeof extra === 'string' ? { prepend: extra } : extra),
      });
    }

    return {
      key: getKey(code, extension),
      refs: 1,
      code,
      dir,
      configPath,
      notations,
      files,
      pc,
      options: executeOptions,
    };
  }

  /**
   * Load the blocks into the project, in one snapshot
   */
  function open(blocks: Block[]): Snapshot {
    const next = new Map<string, string>();
    /** root files of each project, grouped by compiler options */
    const configs = new Map<string, { compilerOptions: unknown; files: string[] }>();
    for (const block of blocks) {
      let config = configs.get(block.configPath);
      if (!config) {
        config = { compilerOptions: block.notations.compilerOptions, files: [] };
        configs.set(block.configPath, config);
      }
      for (const file of block.files) {
        next.set(file.filepath, (file.prepend ?? '') + file.content + (file.append ?? ''));
        config.files.push(file.filepath);
      }
    }
    for (const [configPath, config] of configs) next.set(configPath, JSON.stringify(config));

    const changed: string[] = [];
    const created: string[] = [];
    const deleted: string[] = [];
    for (const [file, content] of next) {
      const current = files.get(file);
      if (current === content) continue;
      (current === undefined ? created : changed).push(file);
    }
    for (const file of files.keys()) {
      if (!next.has(file)) deleted.push(file);
    }
    files.clear();
    for (const [file, content] of next) files.set(file, content);

    const openProjects: string[] = [];
    const closeProjects: string[] = [];
    for (const configPath of configs.keys()) {
      if (!openedProjects.has(configPath)) openProjects.push(configPath);
    }
    for (const configPath of openedProjects) {
      if (!configs.has(configPath)) closeProjects.push(configPath);
    }
    openedProjects = new Set(configs.keys());

    api ??= new API({
      cwd: root,
      fs: {
        readFile: (file) => files.get(normalizePath(file)),
        fileExists: (file) => (files.has(normalizePath(file)) ? true : undefined),
        directoryExists: (dir) => (dir.startsWith(root) ? true : undefined),
      },
    });
    const prev = snapshot;
    snapshot = api.updateSnapshot({
      openProjects,
      closeProjects,
      fileChanges: { changed, created, deleted },
    });
    prev?.dispose();
    return snapshot;
  }

  function run(blocks: Block[]) {
    const snapshot = open(blocks);
    for (const block of blocks) {
      try {
        const project = snapshot.getProject(block.configPath);
        if (!project) {
          throw new TwoslashError('Failed to load project', `Cannot open ${block.configPath}`);
        }
        results.set(block.key, { refs: block.refs, value: analyze(block, project) });
      } catch (error) {
        results.set(block.key, { refs: block.refs, error });
      }
    }
  }

  function twoslasher(
    code: string,
    extension = 'ts',
    executeOptions: TwoslashExecuteOptions = options,
  ): TwoslashReturn {
    const key = getKey(code, extension);
    let result = results.get(key);
    if (!result) {
      run([pending.get(key) ?? parse(code, extension, executeOptions)]);
      pending.delete(key);
      result = results.get(key)!;
    }
    if (--result.refs <= 0) results.delete(key);
    if (result.value) return result.value;
    throw result.error;
  }

  twoslasher.prepare = (
    code: string,
    extension = 'ts',
    executeOptions: TwoslashExecuteOptions = options,
  ): Promise<void> => {
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
        pending.set(key, parse(code, extension, executeOptions));
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

function analyze(block: Block, project: Project): TwoslashReturn {
  const { code, notations, pc } = block;
  const { shouldGetHoverInfo = () => true, filterNode } = block.options;
  const { handbookOptions, removals } = notations;
  let nodes: NodeWithoutPosition[] = [...notations.tags];
  const isInRemoval = (index: number) =>
    index >= code.length || index < 0 || isInRanges(index, removals, false);

  const { checker, program } = project;
  const configErrors = program.getConfigFileParsingDiagnostics();
  if (configErrors.length > 0 && !handbookOptions.noErrorValidation) {
    throw new TwoslashError(
      'Invalid compiler options',
      configErrors.map((d) => d.text).join('\n'),
      'Check the inline compiler flags in the code block.',
    );
  }

  const identifiersMap = new Map<VirtualFile, Node[]>();
  function getIdentifiersOfFile(file: VirtualFile): Node[] {
    let identifiers = identifiersMap.get(file);
    if (!identifiers) {
      const sourceFile = program.getSourceFile(file.filepath);
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
      text = checker.typeToString(type, undefined, typeFlags);
      typeStrings.set(type.id, text);
    }
    return text;
  }

  const described = new Map<string, string>();
  const symbolDocs = new Map<number, Pick<NodeHover, 'docs' | 'tags'>>();
  function getHover(
    file: VirtualFile,
    node: Node,
    symbol: Symbol,
    type: Type,
  ): NodeWithoutPosition<NodeHover> {
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
        type = checker.getTypeOfSymbol(property) ?? type;
      }
    }

    const key = `${target.id}:${type.id}:${getCall(node) ? 1 : 0}`;
    let text = described.get(key);
    if (text === undefined) {
      text = describeSymbol(project, target, type, node, typeToString);
      described.set(key, text);
    }
    if (symbol.flags & SymbolFlags.Alias) {
      // call sites display the resolved signature without keyword
      if (getCall(node)) text = text.replace(/^function /, '');
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

    const start = toCode(file, node.getStart());
    const name = node.getText();
    return { type: 'hover', text, ...docs, start, length: name.length, target: name };
  }

  /**
   * Resolve symbols & types of identifiers in one batch
   */
  function getHovers(file: VirtualFile, identifiers: Node[]) {
    const positions = identifiers.map((node) => node.getStart());
    const symbols = checker.getSymbolAtPosition(file.filepath, positions);
    const types = checker.getTypeAtLocation(identifiers);
    const out: NodeWithoutPosition<NodeHover>[] = [];
    for (let i = 0; i < identifiers.length; i++) {
      const symbol = symbols[i];
      const type = types[i];
      if (symbol && type) out.push(getHover(file, identifiers[i], symbol, type));
    }
    return out;
  }

  if (!handbookOptions.noStaticSemanticInfo) {
    for (const file of block.files) {
      const identifiers = getIdentifiersOfFile(file).filter((node) => {
        const start = toCode(file, node.getStart());
        return !isInRemoval(start) && shouldGetHoverInfo(node.getText(), start, file.filename);
      });
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
    const node = getIdentifiersOfFile(file).find((node) => {
      const start = toCode(file, node.getStart());
      return isInRange(query, [start, start + node.getText().length]);
    });
    const hover = node ? getHovers(file, [node])[0] : undefined;
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

    const position = toFile(file, target);
    let prefix = /[$\w]+$/.exec(code.slice(0, target))?.[0] ?? '';
    const completions: NodeCompletion['completions'] = [];
    let result;
    if (prefix) {
      result = checker.getCompletionsAtPosition(file.filepath, position - 1);
    } else {
      prefix = code[target - 1];
      result = checker.getCompletionsAtPosition(file.filepath, position, {
        triggerCharacter: completionTriggers.includes(prefix) ? prefix : undefined,
      });
    }
    for (const entry of result?.entries ?? []) {
      if (!entry.name.startsWith(prefix)) continue;
      completions.push({ name: entry.name, kind: entry.kind && completionKinds[entry.kind] });
    }
    if (completions.length === 0 && !handbookOptions.noErrorValidation) {
      throw new TwoslashError(
        'Invalid completion query',
        `The request on line ${pc.indexToPos(target).line} in ${file.filename} for completions via ^| returned no completions from the compiler. (prefix: ${prefix})`,
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
    for (const file of block.files) {
      const diagnostics = [
        ...program.getSemanticDiagnostics(file.filepath),
        ...program.getSyntacticDiagnostics(file.filepath),
      ];
      for (const diagnostic of diagnostics) {
        if (ignores.includes(diagnostic.code)) continue;
        const start = toCode(file, diagnostic.pos);
        if (noErrorsCutted && isInRemoval(start)) continue;
        const length = diagnostic.end - diagnostic.pos;
        errorNodes.push({
          type: 'error',
          start,
          length,
          code: diagnostic.code,
          filename: file.filename,
          text: flattenDiagnostic(diagnostic),
          level: (['warning', 'error', 'suggestion', 'message'] as const)[diagnostic.category],
        });
      }
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
