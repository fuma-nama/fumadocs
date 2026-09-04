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
  defaultHandbookOptions,
  findCutNotations,
  findFlagNotations,
  findQueryMarkers,
  TwoslashError,
  validateCodeForErrors,
  type HandbookOptions,
  type NodeCompletion,
  type NodeError,
  type NodeHover,
  type NodeWithoutPosition,
  type TwoslashInstance,
  type TwoslashReturn,
  type TwoslashReturnMeta,
  type VirtualFile,
} from 'twoslash/core';
import {
  createPositionConverter,
  isInRange,
  isInRanges,
  removeCodeRanges,
  resolveNodePositions,
} from 'twoslash-protocol';
import path from 'node:path';

export interface TwoslasherOptions {
  /**
   * Directory the code blocks are virtually placed in, modules are resolved from here.
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
   * A set of known `// @[tags]` tags to extract and not treat as a comment
   */
  customTags?: string[];
  /**
   * A custom hook to filter out hover info for certain identifiers
   */
  shouldGetHoverInfo?: (identifier: string, start: number, filename: string) => boolean;
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
const reFilename = /^[\t\v\f ]*\/\/\s?@filename: (.+)$/gm;
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

function parseFlagValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.includes(',')) return value.split(',').map((v) => v.trim());
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

function splitFiles(code: string, defaultFilename: string, root: string): VirtualFile[] {
  const files: VirtualFile[] = [];
  let filename = defaultFilename;
  let index = 0;

  function push(end: number) {
    if (end === index) return;
    files.push({
      offset: index,
      filename,
      filepath: root + filename,
      content: code.slice(index, end),
      extension: filename.slice(filename.lastIndexOf('.') + 1),
    });
  }

  for (const match of code.matchAll(reFilename)) {
    push(match.index);
    filename = match[1].trimEnd();
    index = match.index;
  }
  push(code.length);
  return files;
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

export function createTwoslasher(options: TwoslasherOptions = {}): TwoslashInstance {
  const root = `${normalizePath(options.cwd ?? process.cwd())}/`;
  const configPath = `${root}tsconfig.twoslash.json`;
  const files = new Map<string, string>();
  let api: API | undefined;
  let snapshot: Snapshot | undefined;

  function open(next: Map<string, string>): Project {
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

    api ??= new API({
      cwd: root,
      fs: {
        readFile: (file) => files.get(normalizePath(file)),
        fileExists: (file) => (files.has(normalizePath(file)) ? true : undefined),
      },
    });

    if (!snapshot) {
      snapshot = api.updateSnapshot({ openProjects: [configPath] });
    } else if (changed.length + created.length + deleted.length > 0) {
      const prev = snapshot;
      snapshot = api.updateSnapshot({ fileChanges: { changed, created, deleted } });
      prev.dispose();
    }

    const project = snapshot.getProject(configPath);
    if (!project) {
      throw new TwoslashError('Failed to load project', `Cannot open ${configPath}`, '');
    }
    return project;
  }

  function twoslasher(
    code: string,
    extension = 'ts',
    executeOptions: Parameters<TwoslashInstance>[2] = {},
  ): TwoslashReturn {
    const {
      customTags = options.customTags ?? [],
      shouldGetHoverInfo = options.shouldGetHoverInfo ?? (() => true),
      filterNode,
    } = executeOptions;

    const meta: TwoslashReturnMeta = {
      extension,
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
      removals: [],
      flagNotations: [],
      virtualFiles: [],
      positionQueries: executeOptions.positionQueries ?? [],
      positionCompletions: executeOptions.positionCompletions ?? [],
      positionHighlights: executeOptions.positionHighlights ?? [],
    };

    let nodes: NodeWithoutPosition[] = [];
    const isInRemoval = (index: number) =>
      index >= code.length || index < 0 || isInRanges(index, meta.removals, false) !== undefined;

    // without option declarations, compiler flags are parsed as "unknown" and validated by TypeScript through the config file
    meta.flagNotations = findFlagNotations(code, customTags, []);
    for (const flag of meta.flagNotations) {
      switch (flag.type) {
        case 'unknown':
          Object.assign(meta.compilerOptions, { [flag.name]: parseFlagValue(flag.value) });
          break;
        case 'handbookOptions':
          Object.assign(meta.handbookOptions, { [flag.name]: flag.value });
          break;
        case 'tag':
          nodes.push({
            type: 'tag',
            name: flag.name,
            start: flag.end,
            length: 0,
            text: flag.value,
          });
          break;
      }
      meta.removals.push([flag.start, flag.end]);
    }

    const pc = createPositionConverter(code);
    findCutNotations(code, meta);
    findQueryMarkers(code, meta, pc);
    meta.virtualFiles = splitFiles(code, `index.${extension}`, root);

    const next = new Map<string, string>();
    for (const file of meta.virtualFiles) {
      if (
        supportedExtensions.includes(file.extension) ||
        (file.extension === 'json' && meta.compilerOptions.resolveJsonModule)
      ) {
        file.supportLsp = true;
        next.set(file.filepath, file.content);
      }
    }
    next.set(
      configPath,
      JSON.stringify({
        compilerOptions: meta.compilerOptions,
        files: Array.from(next.keys()),
      }),
    );

    const project = open(next);
    const { checker, program } = project;
    const configErrors = program.getConfigFileParsingDiagnostics();
    if (configErrors.length > 0 && !meta.handbookOptions.noErrorValidation) {
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
      return meta.virtualFiles.find((i) => isInRange(pos, [i.offset, i.offset + i.content.length]));
    }
    function getPositionInCode(file: VirtualFile, node: Node): number {
      return node.getStart() + file.offset;
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

    const symbolDocs = new Map<number, Pick<NodeHover, 'docs' | 'tags'>>();
    function getHover(
      file: VirtualFile,
      node: Node,
      symbol: Symbol,
      type: Type,
    ): Omit<NodeHover, 'line' | 'character'> {
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

      let text = describeSymbol(project, target, type, node, typeToString);
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

      const start = getPositionInCode(file, node);
      const name = node.getText();
      return { type: 'hover', text, ...docs, start, length: name.length, target: name };
    }

    /**
     * Resolve symbols & types of identifiers in one batch
     */
    function getHovers(file: VirtualFile, identifiers: Node[]) {
      const positions = identifiers.map((node) => getPositionInCode(file, node) - file.offset);
      const symbols = checker.getSymbolAtPosition(file.filepath, positions);
      const types = checker.getTypeAtLocation(identifiers);
      const out: Omit<NodeHover, 'line' | 'character'>[] = [];
      for (let i = 0; i < identifiers.length; i++) {
        const symbol = symbols[i];
        const type = types[i];
        if (symbol && type) out.push(getHover(file, identifiers[i], symbol, type));
      }
      return out;
    }

    for (const file of meta.virtualFiles) {
      if (!file.supportLsp || meta.handbookOptions.noStaticSemanticInfo) continue;
      const identifiers = getIdentifiersOfFile(file).filter((node) => {
        const start = getPositionInCode(file, node);
        return !isInRemoval(start) && shouldGetHoverInfo(node.getText(), start, file.filename);
      });
      nodes.push(...getHovers(file, identifiers));
    }

    for (const query of meta.positionQueries) {
      const file = getFileAtPosition(query);
      if (isInRemoval(query) || !file) {
        throw new TwoslashError(
          'Invalid quick info query',
          `The request on line ${pc.indexToPos(query).line + 2} for quickinfo via ^? is in a removal range.`,
          'This is likely that the positioning is off.',
        );
      }
      const node = getIdentifiersOfFile(file).find((node) => {
        const start = getPositionInCode(file, node);
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

    for (const [start, end, text] of meta.positionHighlights) {
      nodes.push({ type: 'highlight', start, length: end - start, text });
    }

    for (const target of meta.positionCompletions) {
      const file = getFileAtPosition(target);
      if (isInRemoval(target) || !file) {
        throw new TwoslashError(
          'Invalid completion query',
          `The request on line ${pc.indexToPos(target).line + 2} for completions via ^| is in a removal range.`,
          'This is likely that the positioning is off.',
        );
      }

      const position = target - file.offset;
      let prefix = code.slice(0, target).match(/[$\w]+$/)?.[0] ?? '';
      const completions: NodeCompletion['completions'] = [];
      const result = prefix
        ? checker.getCompletionsAtPosition(file.filepath, position - 1)
        : checker.getCompletionsAtPosition(file.filepath, position, {
            triggerCharacter: (prefix = code[target - 1]),
          });
      if (result) {
        for (const entry of result.entries) {
          if (!entry.name.startsWith(prefix)) continue;
          completions.push({ name: entry.name, kind: entry.kind && completionKinds[entry.kind] });
        }
      }
      if (completions.length === 0 && !meta.handbookOptions.noErrorValidation) {
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

    let errorNodes: Omit<NodeError, 'line' | 'character'>[] = [];
    const { noErrors, noErrorsCutted } = meta.handbookOptions;
    if (noErrors !== true) {
      const ignores = Array.isArray(noErrors) ? noErrors : [];
      for (const file of meta.virtualFiles) {
        if (!file.supportLsp) continue;
        const diagnostics = [
          ...program.getSemanticDiagnostics(file.filepath),
          ...program.getSyntacticDiagnostics(file.filepath),
        ];
        for (const diagnostic of diagnostics) {
          if (ignores.includes(diagnostic.code)) continue;
          const start = diagnostic.pos + file.offset;
          if (noErrorsCutted && isInRemoval(start)) continue;
          const length = diagnostic.end - diagnostic.pos;
          errorNodes.push({
            type: 'error',
            start,
            length,
            code: diagnostic.code,
            filename: file.filename,
            id: `err-${diagnostic.code}-${start}-${length}`,
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
    if (!meta.handbookOptions.noErrorValidation && errorNodes.length > 0) {
      validateCodeForErrors(errorNodes, meta.handbookOptions, root);
    }

    let outputCode = code;
    if (!meta.handbookOptions.keepNotations) {
      const removed = removeCodeRanges(code, meta.removals, nodes);
      outputCode = removed.code;
      nodes = removed.nodes;
      meta.removals = removed.removals;
    }
    const indexToPos =
      outputCode === code ? pc.indexToPos : createPositionConverter(outputCode).indexToPos;
    const resolved = resolveNodePositions(nodes, indexToPos);

    return {
      code: outputCode,
      nodes: resolved,
      meta,
      get queries() {
        return this.nodes.filter((i) => i.type === 'query');
      },
      get completions() {
        return this.nodes.filter((i) => i.type === 'completion');
      },
      get errors() {
        return this.nodes.filter((i) => i.type === 'error');
      },
      get highlights() {
        return this.nodes.filter((i) => i.type === 'highlight');
      },
      get hovers() {
        return this.nodes.filter((i) => i.type === 'hover');
      },
      get tags() {
        return this.nodes.filter((i) => i.type === 'tag');
      },
    };
  }

  twoslasher.getCacheMap = () => undefined;
  return twoslasher;
}
