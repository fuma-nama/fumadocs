import path from 'node:path';
import MagicString from 'magic-string';
import { Visitor } from 'oxc-parser';
import type {
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  Function as AstFunction,
  ImportDeclaration,
  ImportDeclarationSpecifier,
  ModuleExportName,
  ObjectExpression,
  ParamPattern,
  Program,
  Statement,
} from '@oxc-project/types';
import type { Framework } from '@/config';
import type { RouteHandlerHttpMethod, StaticInfo } from './route-handler';

const reactRouterLoaderMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const reactRouterActionMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ParsedRouteInfo = StaticInfo<string, string | undefined>;

function moduleExportNameString(name: ModuleExportName): string {
  if (name.type === 'Identifier') return name.name;
  if (name.type === 'Literal') return String(name.value);
  return '';
}

function getImportedBinding(
  spec: ImportDeclarationSpecifier,
): { imported: string; local: string } | null {
  if (spec.type === 'ImportSpecifier') {
    return {
      imported: moduleExportNameString(spec.imported),
      local: spec.local.name,
    };
  }
  if (spec.type === 'ImportDefaultSpecifier') {
    return { imported: 'default', local: spec.local.name };
  }
  return null;
}

function collectMacroBindings(
  program: Program,
): { importDecls: ImportDeclaration[]; locals: Set<string> } | null {
  const locals = new Set<string>();
  const importDecls: ImportDeclaration[] = [];
  const seenDecl = new Set<ImportDeclaration>();

  new Visitor({
    ImportDeclaration(node: ImportDeclaration) {
      for (const spec of node.specifiers) {
        const b = getImportedBinding(spec);
        if (!b) continue;
        if (b.imported === '$routeHandler' || b.imported === 'default') {
          locals.add(b.local);
          if (!seenDecl.has(node)) {
            seenDecl.add(node);
            importDecls.push(node);
          }
        }
      }
    },
  }).visit(program);

  if (locals.size === 0) return null;
  return { importDecls, locals };
}

function collectRouteHandlerCalls(program: Program, locals: Set<string>): CallExpression[] {
  const calls: CallExpression[] = [];
  new Visitor({
    CallExpression(node: CallExpression) {
      if (node.callee.type !== 'Identifier') return;
      if (!locals.has(node.callee.name)) return;
      calls.push(node);
    },
  }).visit(program);
  return calls;
}

function isSameCall(init: Expression | null | undefined, call: CallExpression): boolean {
  if (!init || init.type !== 'CallExpression') return false;
  return init.start === call.start && init.end === call.end;
}

function findStatementSpanForCall(
  program: Program,
  call: CallExpression,
): { start: number; end: number } | null {
  for (const stmt of program.body) {
    const span = statementSpanIfContainsCall(stmt, call);
    if (span) return span;
  }
  return null;
}

function statementSpanIfContainsCall(
  stmt: Statement,
  call: CallExpression,
): { start: number; end: number } | null {
  if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration?.type === 'VariableDeclaration') {
    for (const d of stmt.declaration.declarations) {
      if (isSameCall(d.init, call)) return { start: stmt.start, end: stmt.end };
    }
  }
  if (stmt.type === 'VariableDeclaration') {
    for (const d of stmt.declarations) {
      if (isSameCall(d.init, call)) return { start: stmt.start, end: stmt.end };
    }
  }
  return null;
}

function objectPropertyKeyName(key: ObjectExpression['properties'][number]): string | null {
  if (key.type !== 'Property') return null;
  const k = key.key;
  if (k.type === 'Identifier') return k.name;
  if (k.type === 'Literal' && typeof k.value === 'string') return k.value;
  return null;
}

/**
 * Read `methods`, `params`, and optional `catchAll` from the `$routeHandler` info object literal (AST).
 */
export function parseRouteInfoFromAst(info: ObjectExpression): ParsedRouteInfo {
  let methods: string[] | undefined;
  let params: string[] | undefined;
  let catchAll: string | undefined;

  for (const prop of info.properties) {
    if (prop.type !== 'Property') continue;
    const name = objectPropertyKeyName(prop);
    if (name === 'methods') {
      if (prop.value.type !== 'ArrayExpression') {
        throw new Error(
          'route-handler.build: `methods` in $routeHandler info must be an array literal',
        );
      }
      const out: string[] = [];
      for (const el of prop.value.elements) {
        if (el == null) continue;
        if (el.type === 'Literal' && typeof el.value === 'string') {
          out.push(el.value);
          continue;
        }
        throw new Error(
          'route-handler.build: `methods` must be string literals (e.g. methods: ["GET", "POST"])',
        );
      }
      methods = out;
    }
    if (name === 'params') {
      if (prop.value.type !== 'ArrayExpression') {
        throw new Error('route-handler.build: `params` must be an array literal');
      }
      const out: string[] = [];
      for (const el of prop.value.elements) {
        if (el == null) continue;
        if (el.type === 'Literal' && typeof el.value === 'string') {
          out.push(el.value);
          continue;
        }
        throw new Error('route-handler.build: `params` must be string literals');
      }
      params = out;
    }
    if (name === 'catchAll') {
      if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
        catchAll = prop.value.value;
        continue;
      }
      throw new Error('route-handler.build: `catchAll` must be a string literal');
    }
  }

  if (!methods?.length) {
    throw new Error(
      'route-handler.build: $routeHandler info must include a non-empty `methods` array',
    );
  }
  if (!params) {
    throw new Error(
      'route-handler.build: $routeHandler info must include a `params` array literal',
    );
  }

  return { methods: methods as RouteHandlerHttpMethod[], params, catchAll };
}

function needsRouteParams(info: ParsedRouteInfo): boolean {
  return info.params.length > 0 || Boolean(info.catchAll);
}

function encodeKey(key: string): string {
  if (key.includes('-')) {
    return JSON.stringify(key);
  }
  return key;
}

function bindingNameFromParam(p: ParamPattern): string | null {
  if (p.type === 'Identifier') return p.name;
  return null;
}

function parseHandlerFromAst(
  s: MagicString,
  expr: Expression,
): { requestName: string; paramsName: string | null; bodyText: string } {
  const isFn = expr.type === 'FunctionExpression';
  const isArrow = expr.type === 'ArrowFunctionExpression';
  if (!isFn && !isArrow) {
    throw new Error(
      'route-handler.build: second argument to $routeHandler must be a function or async arrow function',
    );
  }
  const fn = expr as ArrowFunctionExpression | (AstFunction & { type: 'FunctionExpression' });
  if (!fn.async) {
    throw new Error('route-handler.build: route handler must be async');
  }
  if (isFn && (!fn.body || fn.body.type !== 'BlockStatement')) {
    throw new Error('route-handler.build: function handler must use a block body');
  }

  const p0 = fn.params[0];
  const p1 = fn.params[1];
  if (fn.params.length > 2) {
    throw new Error('route-handler.build: route handler must have at most two parameters');
  }

  const requestName = (p0 && bindingNameFromParam(p0)) || 'request';
  const paramsName = p1 ? bindingNameFromParam(p1) : null;
  if (p1 && !paramsName) {
    throw new Error(
      'route-handler.build: unsupported parameter pattern; use a simple identifier for (request, params)',
    );
  }

  const body = fn.body;
  let bodyText: string;

  if (body == null) {
    throw new Error('route-handler.build: handler has no body');
  } else if (body.type === 'BlockStatement') {
    bodyText = s.slice(body.start + 1, body.end - 1).trim();
  } else if (fn.type === 'ArrowFunctionExpression') {
    const expr = s.slice(body.start, body.end);
    bodyText = `return ${expr};`;
  } else {
    throw new Error('route-handler.build: could not extract handler body');
  }

  return { requestName, paramsName, bodyText };
}

function buildParamsObjectLiteral(
  framework: Framework,
  info: ParsedRouteInfo,
  paramsIdentifier: string,
): string {
  const parts: string[] = [];
  for (const k of info.params) {
    parts.push(`${encodeKey(k)}: ${paramsIdentifier}.${k}`);
  }

  if (info.catchAll) {
    let value: string;
    switch (framework) {
      case 'react-router':
        value = `${paramsIdentifier}['*']`;
        break;
      case 'tanstack-start':
        value = `${paramsIdentifier}._splat`;
        break;
      default:
        value = `${paramsIdentifier}.${info.catchAll}`;
    }

    parts.push(`${encodeKey(info.catchAll)}: ${value}`);
  }

  return `{\n${indentBlock(parts.join(',\n'), 2)}\n}`;
}

function requestAliasPrefix(framework: Framework, handler: { requestName: string }): string {
  if (framework === 'tanstack-start') {
    if (handler.requestName === 'ctx') {
      throw new Error(
        'route-handler.build: name the request parameter something other than `ctx` for TanStack file routes',
      );
    }
    return `const ${handler.requestName} = ctx.request;\n`;
  }
  if (framework === 'react-router') {
    if (handler.requestName === 'args') {
      throw new Error(
        'route-handler.build: name the request parameter something other than `args` for React Router resource routes',
      );
    }
    return `const ${handler.requestName} = args.request;\n`;
  }
  return '';
}

function buildRouteSetupBlock(
  framework: Framework,
  info: ParsedRouteInfo,
  paramsBinding: string,
): string {
  if (!needsRouteParams(info)) return '';
  let paramsIdentifier: string;
  switch (framework) {
    case 'next':
      paramsIdentifier = '(await ctx.params)';
      break;
    case 'react-router':
      paramsIdentifier = 'args.params';
      break;
    case 'tanstack-start':
      paramsIdentifier = 'ctx.params';
      break;
    case 'waku':
      paramsIdentifier = 'context.params';
      break;
  }

  return `const ${paramsBinding} = ${buildParamsObjectLiteral(framework, info, paramsIdentifier)};\n`;
}

function resolveParamsBindingName(info: ParsedRouteInfo, userSecond: string | null): string | null {
  if (!needsRouteParams(info)) return null;
  return userSecond ?? 'params';
}

function registryRouteToTanStackCreateFileRoutePath(route: string): string {
  const trimmed = route.replace(/^\/+/, '').replace(/\/+$/, '');
  const segments = trimmed.split('/');
  const parts = segments.map((seg) => {
    if (/^\[\[\.\.\.[^/\]]+\]\]$/.test(seg) || /^\[\.\.\.[^/\]]+\]$/.test(seg)) return '$';
    const m = /^\[([^/\]]+)\]$/.exec(seg);
    if (m) return `$${m[1]}`;
    return seg;
  });
  return `/${parts.join('/')}`;
}

/** URL path for `RouteContext` / `ApiContext` string literals (leading slash, App Router–style segments). */
function registryRouteToUrlPath(route: string): string {
  const t = route.replace(/^\/+/, '').replace(/\/+$/, '');
  return t ? `/${t}` : '/';
}

/**
 * React Router typegen: `./+types/<segments>` relative to the route file (see `+types` next to `routes/`).
 */
function computeReactRouterTypesSpecifier(routeFilePath: string): string {
  const normalized = routeFilePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const routesIdx = parts.lastIndexOf('routes');
  const ext = path.extname(routeFilePath);
  const base = path.basename(routeFilePath, ext);
  if (routesIdx >= 0) {
    const dirSegments = parts.slice(routesIdx + 1, -1);
    return `./+types/${[...dirSegments, base].join('.')}`;
  }
  return `./+types/${base}`;
}

function frameworkGeneratedImports(framework: Framework, routeFilePath: string): string {
  const lines: string[] = [];
  if (framework === 'tanstack-start') {
    lines.push(`import { createFileRoute } from '@tanstack/react-router';`);
  }
  if (framework === 'waku') {
    lines.push(`import type { ApiContext } from 'waku/router';`);
  }
  if (framework === 'react-router') {
    lines.push(`import type { Route } from '${computeReactRouterTypesSpecifier(routeFilePath)}';`);
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n');
}

function generateDeclaration(
  framework: Framework,
  route: string,
  parsedInfo: ParsedRouteInfo,
  handler: { requestName: string; paramsName: string | null; bodyText: string },
): string {
  const paramsBinding = resolveParamsBindingName(parsedInfo, handler.paramsName);
  const alias = requestAliasPrefix(framework, handler);
  const setupBlock =
    paramsBinding != null ? buildRouteSetupBlock(framework, parsedInfo, paramsBinding) : '';
  const inner = alias + setupBlock + handler.bodyText;
  const bodyIndented = indentBlock(inner, 2);
  const urlPath = registryRouteToUrlPath(route);
  const urlPathLiteral = JSON.stringify(urlPath);

  switch (framework) {
    case 'next': {
      /** `RouteContext` is provided by Next.js typed routes / `next typegen` (global). */
      const ctxType = `RouteContext<${urlPathLiteral}>`;
      return parsedInfo.methods
        .map(
          (m) =>
            `export async function ${m}(${handler.requestName}: Request, ctx: ${ctxType}) {\n${bodyIndented}\n}`,
        )
        .join('\n\n');
    }
    case 'waku': {
      const ctxType = `ApiContext<${urlPathLiteral}>`;
      return parsedInfo.methods
        .map(
          (m) =>
            `export async function ${m}(${handler.requestName}: Request, context: ${ctxType}) {\n${bodyIndented}\n}`,
        )
        .join('\n\n');
    }
    case 'tanstack-start': {
      const fileRoutePath = JSON.stringify(registryRouteToTanStackCreateFileRoutePath(route));
      const entries = parsedInfo.methods
        .map((m) => `      ${m}: async (ctx) => {\n${indentBlock(inner, 8)}\n      },`)
        .join('\n');
      return `export const Route = createFileRoute(${fileRoutePath})({\n  server: {\n    handlers: {\n${entries}\n    },\n  },\n});\n`;
    }
    case 'react-router': {
      const includeLoader = parsedInfo.methods.some((x) => reactRouterLoaderMethods.has(x));
      const includeAction = parsedInfo.methods.some((x) => reactRouterActionMethods.has(x));
      if (!includeLoader && !includeAction) {
        throw new Error(
          'route-handler.build: react-router needs at least one method mapped to loader (GET/HEAD/OPTIONS) or action (POST/PUT/PATCH/DELETE)',
        );
      }
      const parts: string[] = [];
      if (includeLoader) {
        parts.push(`export async function loader(args: Route.LoaderArgs) {\n${bodyIndented}\n}`);
      }
      if (includeAction) {
        parts.push(`export async function action(args: Route.ActionArgs) {\n${bodyIndented}\n}`);
      }
      return `${parts.join('\n\n')}\n`;
    }
    default: {
      const _exhaustive: never = framework;
      return _exhaustive;
    }
  }
}

function removeMacroImport(s: MagicString, importDecl: ImportDeclaration): void {
  const start = importDecl.start;
  let end = importDecl.end;
  if (s.original[end] === '\n') end += 1;
  s.remove(start, end);
}

/**
 * Rewrites a module that calls `$routeHandler` into framework-native route code.
 *
 * Output does not import `@fumadocs/cli`.
 *
 * Uses framework typegen where applicable: global `RouteContext` (Next typed routes), `ApiContext` (Waku),
 * inferred handler `ctx` (TanStack `createFileRoute`), `Route.LoaderArgs` / `Route.ActionArgs` (React Router `+types`).
 */
export function buildRouteHandlerFile(
  route: string,
  routeFilePath: string,
  framework: Framework,
  program: Program,
  s: MagicString,
) {
  const macro = collectMacroBindings(program);
  if (!macro) return;

  const calls = collectRouteHandlerCalls(program, macro.locals);
  if (calls.length === 0) return;
  if (calls.length > 1) {
    throw new Error('route-handler.build: expected exactly one $routeHandler(...) call per file');
  }

  const call = calls[0]!;
  if (call.arguments.length !== 2) {
    throw new Error('route-handler.build: $routeHandler must be called with (info, handler)');
  }

  const arg0 = call.arguments[0] as Expression;
  const arg1 = call.arguments[1] as Expression;
  if (arg0.type !== 'ObjectExpression') {
    throw new Error(
      'route-handler.build: first argument to $routeHandler must be an object literal',
    );
  }

  const parsedInfo = parseRouteInfoFromAst(arg0);
  const handler = parseHandlerFromAst(s, arg1);

  const stmtSpan = findStatementSpanForCall(program, call);
  if (!stmtSpan) {
    throw new Error(
      'route-handler.build: $routeHandler(...) must be the initializer of a const (optionally exported)',
    );
  }

  const extraImports = frameworkGeneratedImports(framework, routeFilePath);
  if (extraImports) {
    const insertPos = findInsertPositionForNewImports(program, macro.importDecls);
    if (insertPos === 0) {
      s.prepend(extraImports);
    } else {
      s.appendLeft(insertPos, `\n${extraImports}`);
    }
  }

  for (const decl of [...macro.importDecls].sort((a, b) => b.start - a.start)) {
    removeMacroImport(s, decl);
  }
  s.overwrite(
    stmtSpan.start,
    stmtSpan.end,
    generateDeclaration(framework, route, parsedInfo, handler),
  );
}

function findInsertPositionForNewImports(
  program: Program,
  skipImports: readonly ImportDeclaration[],
): number {
  const skip = new Set(skipImports);
  const others = program.body.filter(
    (stmt): stmt is ImportDeclaration => stmt.type === 'ImportDeclaration' && !skip.has(stmt),
  );
  if (others.length === 0) return 0;
  return others[others.length - 1]!.end;
}
