import path from 'node:path';
import MagicString from 'magic-string';
import { createCodegen, slash } from '@/utils/codegen';

export const MacroModuleId = 'fumadocs-mdx/macro';

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
  id: number;
  fn: MacroFn;
  node: Node;
  options: Node | undefined;
}

interface ParsedMacroModule {
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

export function macroCollectionName(cfg: string, id: number): string {
  return `${cfg.replace(/[^a-zA-Z0-9_-]/g, '_')}_${id}`;
}

async function parseModule(code: string, file: string): Promise<Node | null> {
  const { parse, langFromPath } = await import('yuku-parser');
  const lang = langFromPath(file) ?? 'ts';
  const result = parse(code, { lang, source_type: 'module' } as never) as {
    program: unknown;
    diagnostics: { message?: string; span?: { start: number } }[];
  };

  const errors = result.diagnostics;
  if (errors.length > 0) {
    const first = errors[0];
    throw new MacroTransformError(
      file,
      code,
      first.span?.start ?? 0,
      `failed to parse module: ${first.message ?? 'syntax error'}`,
    );
  }

  return result.program as Node;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

function* children(node: Node): Generator<Node> {
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) yield item;
      }
    } else if (isNode(value)) {
      yield value;
    }
  }
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
  const program = await parseModule(code, file);
  if (!program) return null;

  const locals = new Map<string, MacroFn>();
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

      locals.set((spec.local as Node).name as string, name);
    }

    imports.push(statement);
  }

  if (locals.size === 0) return imports.length > 0 ? { program, imports, calls: [] } : null;

  // macro calls allowed at top-level positions only
  const calls: MacroCall[] = [];
  const allowedCallees = new Set<Node>();

  function onPossibleCall(node: Node | null | undefined) {
    if (!node || node.type !== 'CallExpression') return;
    const callee = node.callee as Node;
    if (callee.type !== 'Identifier') return;
    const fn = locals.get(callee.name as string);
    if (fn === undefined) return;

    const args = node.arguments as Node[];
    if (args.length > 1 || (args.length === 1 && args[0].type === 'SpreadElement')) {
      throw new MacroTransformError(
        file,
        code,
        node.start,
        `macro calls only accept an inline options object.`,
      );
    }

    allowedCallees.add(callee);
    calls.push({
      id: calls.length,
      fn,
      node,
      options: args[0],
    });
  }

  for (const statement of program.body as Node[]) {
    let target: Node = statement;
    if (statement.type === 'ExportNamedDeclaration' && isNode(statement.declaration)) {
      target = statement.declaration;
    }

    if (target.type === 'VariableDeclaration') {
      for (const declarator of target.declarations as Node[]) {
        onPossibleCall(declarator.init as Node | null);
      }
    } else if (statement.type === 'ExportDefaultDeclaration' && isNode(statement.declaration)) {
      onPossibleCall(statement.declaration);
    } else if (target.type === 'ExpressionStatement') {
      onPossibleCall(target.expression as Node);
    }
  }

  // reject other references to macro functions (e.g. nested calls, aliasing)
  const importSpans = imports.map((node) => [node.start, node.end] as const);

  function walk(node: Node) {
    if (node.type.startsWith('TS')) return;

    if (
      node.type === 'Identifier' &&
      locals.has(node.name as string) &&
      !allowedCallees.has(node) &&
      !importSpans.some(([start, end]) => node.start >= start && node.end <= end)
    ) {
      throw new MacroTransformError(
        file,
        code,
        node.start,
        `macros from ${MacroModuleId} can only be called directly at the top level of the module.`,
      );
    }

    for (const child of children(node)) {
      // skip non-computed keys/properties, they are not references
      if (node.type === 'Property' && !node.computed && child === node.key) continue;
      if (node.type === 'MemberExpression' && !node.computed && child === node.property) continue;
      walk(child);
    }
  }

  walk(program);

  return { program, imports, calls };
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
    const name = macroCollectionName(cfg, call.id);
    const query = { collection: name, cfg, id: String(call.id) };
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

      return { files, isAsync, extractLinkReferences };
    }

    async function generateDocArgs(docOptions: Node | undefined): Promise<string[]> {
      const { files, isAsync, extractLinkReferences } = docGlobs(docOptions);
      const args: string[] = [];

      if (extractLinkReferences) {
        args.push(`passthroughs: ["extractedReferences"]`);
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
 * Macro calls are replaced with global registration calls, such that evaluating the module
 * collects the raw (non-serializable) collection options.
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

    const prefix = `${JSON.stringify(cfg)}, ${JSON.stringify(call.fn)}, `;
    if (call.options) {
      s.appendLeft(call.options.start, prefix);
    } else {
      // no argument: insert before the closing parenthesis
      s.appendLeft(call.node.end - 1, `${prefix}undefined`);
    }
  }

  return s.toString();
}
