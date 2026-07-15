import path from 'node:path';
import MagicString from 'magic-string';
import type {
  Module as YukuModule,
  Symbol as YukuSymbol,
  NodeOfType,
  NodeType,
} from 'yuku-analyzer';
import { createCodegen, slash } from '@/utils/codegen';
import { MacroModuleId } from './options';

type YukuNode = NodeOfType<NodeType>;

const SupportedPatterns = {
  doc: '**/*.{mdx,md}',
  meta: '**/*.{json,yaml}',
};

type MacroFn = 'defineDocs' | 'defineCollections';

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

interface MacroCall {
  /**
   * name of the top-level variable the macro is assigned to
   */
  name: string;
  fn: MacroFn;
  node: Node;
  options: Node | undefined;
}

interface ParsedMacroModule {
  module: YukuModule;
  program: Node;
  imports: Node[];
  calls: MacroCall[];
}

export interface MacroTransformOptions {
  code: string;
  /**
   * absolute path of the module
   */
  file: string;
  /**
   * project root (absolute), `dir` options and `cfg` queries are relative to it
   */
  root: string;
  target: 'vite' | 'import';
}

export interface MacroTransformResult {
  code: string;
  map: unknown;
  /**
   * absolute paths of content directories referenced by macro calls, for directory-level invalidation
   */
  dirs: string[];
}

export class MacroTransformError extends Error {
  constructor(file: string, code: string, offset: number, message: string) {
    const { line, column } = position(code, offset);
    super(`[MDX] ${file}:${line}:${column}: ${message}`);
  }
}

function position(code: string, offset: number) {
  let line = 1;
  let lineStart = 0;

  for (let i = 0; i < offset && i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }

  return { line, column: offset - lineStart + 1 };
}

/**
 * The identity of a macro collection: the module that declares it (relative to root) + the
 * name of its top-level variable.
 *
 * `#` cannot appear in a JS identifier, so the name is always the segment after the last one.
 */
export function macroId(cfg: string, name: string): string {
  return `${cfg}#${name}`;
}

export function parseMacroId(id: string): { cfg: string; name: string } | undefined {
  const at = id.lastIndexOf('#');
  if (at === -1) return;

  const cfg = id.slice(0, at);
  const name = id.slice(at + 1);
  if (!cfg || !name) return;

  return { cfg, name };
}

async function analyzeModule(code: string, file: string): Promise<YukuModule> {
  const { Analyzer } = await import('yuku-analyzer');
  const module = new Analyzer().addFile(file, code, { sourceType: 'module' });
  const errors = module.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0) {
    const first = errors[0];
    throw new MacroTransformError(
      file,
      code,
      first.start,
      `failed to parse module: ${first.message}`,
    );
  }

  return module;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

/**
 * extract statically analyzable values (JSON-like literals only)
 */
function staticValue(node: Node): { ok: true; value: unknown } | { ok: false } {
  switch (node.type) {
    case 'Literal':
      if ('regex' in node && node.regex) return { ok: false };
      return { ok: true, value: node.value };
    case 'TemplateLiteral': {
      const expressions = node.expressions as Node[];
      const quasis = node.quasis as { value: { cooked?: string } }[];
      if (expressions.length > 0) return { ok: false };
      return { ok: true, value: quasis[0]?.value.cooked ?? '' };
    }
    case 'ArrayExpression': {
      const out: unknown[] = [];
      for (const element of node.elements as (Node | null)[]) {
        if (!element || element.type === 'SpreadElement') return { ok: false };
        const item = staticValue(element);
        if (!item.ok) return item;
        out.push(item.value);
      }
      return { ok: true, value: out };
    }
    case 'ObjectExpression': {
      const out: Record<string, unknown> = {};
      for (const property of node.properties as Node[]) {
        const key = propertyKey(property);
        if (key === undefined) return { ok: false };
        const item = staticValue(property.value as Node);
        if (!item.ok) return item;
        out[key] = item.value;
      }
      return { ok: true, value: out };
    }
    case 'UnaryExpression': {
      if (node.operator !== '-') return { ok: false };
      const item = staticValue(node.argument as Node);
      if (!item.ok || typeof item.value !== 'number') return { ok: false };
      return { ok: true, value: -item.value };
    }
    default:
      return { ok: false };
  }
}

function propertyKey(property: Node): string | undefined {
  if (property.type !== 'Property' || property.kind !== 'init' || property.computed) return;
  const key = property.key as Node;
  if (key.type === 'Identifier') return key.name as string;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
}

function getProperty(object: Node | undefined, name: string): Node | undefined {
  if (!object || object.type !== 'ObjectExpression') return;

  for (const property of object.properties as Node[]) {
    if (propertyKey(property) === name) return property.value as Node;
  }
}

function requireStatic<T>(
  ctx: { file: string; code: string },
  node: Node | undefined,
  name: string,
  check: (value: unknown) => value is T,
  expected: string,
): T | undefined {
  if (!node) return;
  const result = staticValue(node);

  if (!result.ok || !check(result.value)) {
    throw new MacroTransformError(
      ctx.file,
      ctx.code,
      node.start,
      `the \`${name}\` option of a macro must be ${expected}, since it affects how content files are bundled. Move dynamic logic into other options like \`schema\` or \`mdxOptions\`.`,
    );
  }

  return result.value;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

async function parseMacroModule(code: string, file: string): Promise<ParsedMacroModule | null> {
  const module = await analyzeModule(code, file);
  const program = module.ast as unknown as Node;

  const macroSymbols = new Map<YukuSymbol, MacroFn>();
  const imports: Node[] = [];

  for (const statement of program.body as Node[]) {
    if (
      (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportAllDeclaration') &&
      isNode(statement.source) &&
      statement.source.value === MacroModuleId
    ) {
      throw new MacroTransformError(
        file,
        code,
        statement.start,
        `re-exporting from ${MacroModuleId} is not supported.`,
      );
    }

    if (statement.type !== 'ImportDeclaration') continue;
    const source = statement.source as Node;
    if (source.value !== MacroModuleId) continue;
    if (statement.importKind === 'type') {
      imports.push(statement);
      continue;
    }

    for (const spec of statement.specifiers as Node[]) {
      if (spec.type !== 'ImportSpecifier' || spec.importKind === 'type') {
        if (spec.type === 'ImportSpecifier') continue;
        throw new MacroTransformError(
          file,
          code,
          spec.start,
          `only named imports are supported for ${MacroModuleId}.`,
        );
      }

      const imported = spec.imported as Node;
      const name =
        imported.type === 'Identifier' ? (imported.name as string) : (imported.value as string);
      if (name !== 'defineDocs' && name !== 'defineCollections') continue;

      const symbol = module.symbolOf(spec.local as unknown as YukuNode);
      if (symbol) macroSymbols.set(symbol, name);
    }

    imports.push(statement);
  }

  if (macroSymbols.size === 0) {
    return imports.length > 0 ? { module, program, imports, calls: [] } : null;
  }

  // a macro collection is identified by its variable name, so it must be the initializer of a
  // top-level `const` declaration with a plain identifier binding.
  const calls: MacroCall[] = [];
  const allowedCallees = new Set<Node>();

  for (const statement of program.body as Node[]) {
    const target =
      statement.type === 'ExportNamedDeclaration' && isNode(statement.declaration)
        ? statement.declaration
        : statement;
    if (target.type !== 'VariableDeclaration') continue;

    for (const declarator of target.declarations as Node[]) {
      const init = declarator.init as Node | null;
      if (!init || init.type !== 'CallExpression') continue;

      const callee = init.callee as Node;
      if (callee.type !== 'Identifier') continue;
      const symbol = module.symbolOf(callee as unknown as YukuNode);
      const fn = symbol ? macroSymbols.get(symbol) : undefined;
      if (fn === undefined) continue;

      const id = declarator.id as Node;
      if (id.type !== 'Identifier') {
        throw new MacroTransformError(
          file,
          code,
          id.start,
          `a macro collection must be assigned to a plain variable (e.g. \`const docs = ${fn}({ ... })\`), destructuring is not supported because the variable name identifies the collection.`,
        );
      }

      if (target.kind !== 'const') {
        throw new MacroTransformError(
          file,
          code,
          target.start,
          `a macro collection must be declared with \`const\`, since \`${target.kind}\` bindings can be reassigned.`,
        );
      }

      const args = init.arguments as Node[];
      if (args.length > 1 || (args.length === 1 && args[0].type === 'SpreadElement')) {
        throw new MacroTransformError(
          file,
          code,
          init.start,
          `macro calls only accept an inline options object.`,
        );
      }

      allowedCallees.add(callee);
      calls.push({
        name: id.name as string,
        fn,
        node: init,
        options: args[0],
      });
    }
  }

  // reject other references to macro functions (e.g. nested calls, aliasing)
  for (const symbol of macroSymbols.keys()) {
    for (const reference of symbol.references) {
      if (!allowedCallees.has(reference.node as unknown as Node)) {
        throw new MacroTransformError(
          file,
          code,
          reference.node.start,
          `macros from ${MacroModuleId} can only be called as the initializer of a top-level \`const\` declaration, like \`const docs = defineDocs({ ... })\`.`,
        );
      }
    }
  }

  return { module, program, imports, calls };
}

function topLevelStatement(module: YukuModule, node: Node): Node | undefined {
  let current = node;
  for (
    let parent = module.parentOf(current as unknown as YukuNode);
    parent;
    parent = module.parentOf(current as unknown as YukuNode)
  ) {
    if (parent === module.ast) return current;
    current = parent as Node;
  }
}

function retainMacroDependencies(parsed: ParsedMacroModule): Set<Node> {
  const dependencies = new Map<Node, Set<Node>>();

  for (const reference of parsed.module.references) {
    if (reference.inTypePosition || !reference.symbol) continue;
    const statement = topLevelStatement(parsed.module, reference.node as unknown as Node);
    if (!statement) continue;

    let refs = dependencies.get(statement);
    if (!refs) dependencies.set(statement, (refs = new Set()));
    for (const declaration of reference.symbol.declarations) {
      const dependency = topLevelStatement(parsed.module, declaration as Node);
      if (dependency && dependency !== statement) refs.add(dependency);
    }
  }

  const retained = new Set<Node>();
  const pending: Node[] = [];
  for (const call of parsed.calls) {
    const statement = topLevelStatement(parsed.module, call.node);
    if (statement && !retained.has(statement)) {
      retained.add(statement);
      pending.push(statement);
    }
  }

  for (let statement = pending.pop(); statement; statement = pending.pop()) {
    for (const dependency of dependencies.get(statement) ?? []) {
      if (!retained.has(dependency)) {
        retained.add(dependency);
        pending.push(dependency);
      }
    }
  }

  return retained;
}

/**
 * Transform a module using the macro API (app mode).
 *
 * Macro calls are replaced with runtime calls + glob imports, macro imports are removed.
 *
 * @returns `null` when the module doesn't use the macro API.
 */
export async function transformMacroModule({
  code,
  file,
  root,
  target,
}: MacroTransformOptions): Promise<MacroTransformResult | null> {
  const parsed = await parseMacroModule(code, file);
  if (!parsed || parsed.calls.length === 0) return null;

  const ctx = { file, code };
  const cfg = slash(path.relative(root, file));
  const moduleDir = path.dirname(file);
  const codegen = createCodegen({
    target: target === 'vite' ? 'vite' : 'default',
    outDir: moduleDir,
  });
  const s = new MagicString(code);
  const dirs: string[] = [];

  let runtimeName = '__fdm';
  while (code.includes(runtimeName)) runtimeName += '_';

  for (const node of parsed.imports) {
    s.remove(node.start, node.end);
  }

  for (const call of parsed.calls) {
    const query = { macro_id: macroId(cfg, call.name) };
    const options = call.options;

    if (getProperty(options, 'dynamic') ?? getProperty(getProperty(options, 'docs'), 'dynamic')) {
      throw new MacroTransformError(
        ctx.file,
        ctx.code,
        options!.start,
        '`dynamic` collections are not supported by the macro API yet.',
      );
    }

    const dir =
      requireStatic(ctx, getProperty(options, 'dir'), 'dir', isString, 'a string literal') ??
      'content/docs';
    const base = path.resolve(root, dir);
    dirs.push(base);

    function docGlobs(docOptions: Node | undefined) {
      const files = requireStatic(
        ctx,
        getProperty(docOptions, 'files'),
        'files',
        isStringArray,
        'an array of string literals',
      ) ?? [SupportedPatterns.doc];
      const isAsync =
        requireStatic(
          ctx,
          getProperty(docOptions, 'async'),
          'async',
          isBoolean,
          'a boolean literal',
        ) ?? false;
      const extractLinkReferences =
        requireStatic(
          ctx,
          getProperty(getProperty(docOptions, 'postprocess'), 'extractLinkReferences'),
          'postprocess.extractLinkReferences',
          isBoolean,
          'a boolean literal',
        ) ?? false;
      const lastModified =
        requireStatic(
          ctx,
          getProperty(docOptions, 'lastModified'),
          'lastModified',
          isBoolean,
          'a boolean literal',
        ) ?? false;

      return { files, isAsync, extractLinkReferences, lastModified };
    }

    async function generateDocArgs(docOptions: Node | undefined): Promise<string[]> {
      const { files, isAsync, extractLinkReferences, lastModified } = docGlobs(docOptions);
      const args: string[] = [];

      // properties of the compiled document to expose on entries
      const passthroughs: string[] = [];
      if (extractLinkReferences) passthroughs.push('extractedReferences');
      if (lastModified) passthroughs.push('lastModified');
      if (passthroughs.length > 0) {
        args.push(`passthroughs: ${JSON.stringify(passthroughs)}`);
      }

      if (isAsync) {
        const [head, body] = await Promise.all([
          codegen.generateGlobImport(files, {
            base,
            eager: true,
            import: 'frontmatter',
            query: { ...query, only: 'frontmatter' },
          }),
          codegen.generateGlobImport(files, {
            base,
            query,
          }),
        ]);
        args.push(`head: ${head}`, `body: ${body}`);
      } else {
        args.push(
          `entries: ${await codegen.generateGlobImport(files, {
            base,
            eager: true,
            query,
          })}`,
        );
      }

      return args;
    }

    async function generateMetaArg(metaOptions: Node | undefined): Promise<string> {
      const files = requireStatic(
        ctx,
        getProperty(metaOptions, 'files'),
        'files',
        isStringArray,
        'an array of string literals',
      ) ?? [SupportedPatterns.meta];

      return `meta: ${await codegen.generateGlobImport(files, {
        base,
        eager: true,
        import: 'default',
        query,
      })}`;
    }

    let replacement: string;
    if (call.fn === 'defineDocs') {
      const docOptions = getProperty(options, 'docs');
      const { isAsync } = docGlobs(docOptions);
      const args = [
        `base: ${JSON.stringify(slash(dir))}`,
        ...(await generateDocArgs(docOptions)),
        await generateMetaArg(getProperty(options, 'meta')),
      ];

      replacement = `await ${runtimeName}.${isAsync ? 'docsAsync' : 'docs'}({ ${args.join(', ')} })`;
    } else {
      const type = requireStatic(
        ctx,
        getProperty(options, 'type'),
        'type',
        (value): value is 'doc' | 'meta' => value === 'doc' || value === 'meta',
        '"doc" or "meta"',
      );
      if (type === undefined) {
        throw new MacroTransformError(
          ctx.file,
          ctx.code,
          call.node.start,
          'defineCollections requires a `type` option.',
        );
      }

      if (type === 'meta') {
        const args = [`base: ${JSON.stringify(slash(dir))}`, await generateMetaArg(options)];
        replacement = `await ${runtimeName}.meta({ ${args.join(', ')} })`;
      } else {
        const { isAsync } = docGlobs(options);
        const args = [`base: ${JSON.stringify(slash(dir))}`, ...(await generateDocArgs(options))];

        replacement = `await ${runtimeName}.${isAsync ? 'docAsync' : 'doc'}({ ${args.join(', ')} })`;
      }
    }

    s.overwrite(call.node.start, call.node.end, replacement);
  }

  const banner = [
    `import * as ${runtimeName} from "fumadocs-mdx/runtime/macro";`,
    // hoisted glob imports (target: 'import')
    ...codegen.lines,
    '',
  ];
  s.prepend(banner.join('\n'));

  return {
    code: s.toString(),
    map: s.generateMap({ hires: 'boundary', source: file }),
    dirs,
  };
}

export interface MacroConfigTransformOptions {
  code: string;
  file: string;
  /**
   * path of the module relative to root
   */
  cfg: string;
  /**
   * `Symbol.for` key of the global registration function
   */
  registerKey: string;
}

/**
 * Transform a module using the macro API (config mode), for evaluation in the build process.
 *
 * Macro calls are replaced with global registration calls keyed by macro id, such that evaluating
 * the module collects the raw (non-serializable) collection options.
 *
 * @returns `null` when the module doesn't use the macro API.
 */
export async function transformMacroConfigModule({
  code,
  file,
  cfg,
  registerKey,
}: MacroConfigTransformOptions): Promise<string | null> {
  const parsed = await parseMacroModule(code, file);
  if (!parsed) return null;

  const s = new MagicString(code);
  if (parsed.calls.length > 0) {
    const retained = retainMacroDependencies(parsed);
    for (const statement of parsed.program.body as Node[]) {
      if (!retained.has(statement)) s.remove(statement.start, statement.end);
    }
  }

  for (const node of parsed.imports) {
    s.remove(node.start, node.end);
  }

  for (const call of parsed.calls) {
    const callee = call.node.callee as Node;
    s.overwrite(
      callee.start,
      callee.end,
      `(globalThis[Symbol.for(${JSON.stringify(registerKey)})])`,
    );

    const prefix = `${JSON.stringify(macroId(cfg, call.name))}, ${JSON.stringify(call.fn)}, `;
    if (call.options) {
      s.appendLeft(call.options.start, prefix);
    } else {
      // no argument: insert before the closing parenthesis
      s.appendLeft(call.node.end - 1, `${prefix}undefined`);
    }
  }

  return s.toString();
}
