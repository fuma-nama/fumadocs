import fs from 'node:fs/promises';
import MagicString from 'magic-string';
import { parse } from 'oxc-parser';
import type {
  Argument,
  ArrayExpression,
  ExportDefaultDeclarationKind,
  Expression,
  Program,
} from '@oxc-project/types';
import type { Framework } from '@/config';

/**
 * Resolves the route file path (relative to the CLI `baseDir`) from an App Router–style route string.
 *
 * @param route - The route path, e.g., "api/auth/[[...slug]]".
 * @param framework - Value of `framework` in CLI config.
 * @param extension - Optional file extension, default is "ts".
 * @returns Relative path incl. framework route root, e.g. "app/api/foo/route.ts" (next), "routes/api.foo.$.ts" (tanstack-start), or "routes/api/foo/$.ts" (react-router).
 */
export function resolveRouteFilePath(
  route: string,
  framework: Framework,
  extension: string = 'ts',
): string {
  route = route.replace(/^\/+/, '').replace(/\/+$/, '');

  switch (framework) {
    case 'next': {
      return `app/${route}/route.${extension}`;
    }
    case 'tanstack-start': {
      let flat = route
        .replace(/\[\[\.\.\.[^/\]]+\]\]/g, '$')
        .replace(/\[\.\.\.[^/\]]+\]/g, '$')
        .replace(/\[([^/\]]+)\]/g, (_, p1) => `$${p1}`);
      flat = flat.replaceAll('/', '.');
      return `routes/${flat}.${extension}`;
    }
    case 'react-router': {
      const rrPath = route
        .replace(/\[\[\.\.\.[^/\]]+\]\]/g, 'all')
        .replace(/\[\.\.\.[^/\]]+\]/g, 'all')
        .replace(/\[([^/\]]+)\]/g, (_, v) => `$${v}`);
      return `app/routes/${rrPath}.${extension}`;
    }
    case 'waku': {
      const underApi = route
        .replace(/\[\[\.\.\.([^\]]+)\]\]/g, '[...$1]')
        .replace(/\[\.\.\.([^\]]+)\]/g, '[...$1]');
      return `pages/_api/${underApi}.${extension}`;
    }
    default: {
      const _exhaustive: never = framework;
      return _exhaustive;
    }
  }
}

export function resolveReactRouterRoute(route: string): string {
  return route
    .replace(/\[\[\.\.\.[^/\]]+\]\]/g, '*')
    .replace(/\[\.\.\.[^/\]]+\]/g, '*')
    .replace(/\[([^/\]]+)\]/g, (_, v) => `:${v}`);
}

function tsSingleQuotedLiteral(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function unwrapExportDefaultToArrayExpression(
  decl: ExportDefaultDeclarationKind,
): ArrayExpression | null {
  if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
    return null;
  }
  let expr = decl;
  while (expr) {
    if (expr.type === 'ArrayExpression') return expr;
    if (expr.type === 'TSSatisfiesExpression' || expr.type === 'TSAsExpression') {
      expr = expr.expression;
      continue;
    }
    return null;
  }
  return null;
}

function parseStringArgument(expr: Argument | undefined): string | null {
  if (!expr) return null;
  if (expr.type === 'Literal' && typeof expr.value === 'string') return expr.value;
  return null;
}

type ReactRouterRoutesItem =
  | {
      type: 'route';
      path: string;
      module: string;
      expression: Expression;
    }
  | {
      type: 'index';
      module: string;
      expression: Expression;
    };
function parseReactRouterRoutesItem(item: Expression): ReactRouterRoutesItem | undefined {
  if (!item || item.type !== 'CallExpression') return;
  const callee = item.callee;
  if (callee.type !== 'Identifier') return;

  if (callee.name === 'route') {
    const path = parseStringArgument(item.arguments[0]);
    const module = parseStringArgument(item.arguments[1]);
    if (path === null || module === null) return;

    return {
      type: 'route',
      path,
      module,
      expression: item,
    };
  }

  if (callee.name === 'index') {
    const module = parseStringArgument(item.arguments[0]);
    if (module === null) return;

    return {
      type: 'index',
      module,
      expression: item,
    };
  }
}

function findReactRouterRoutesArray(program: Program): ArrayExpression | null {
  for (const stmt of program.body) {
    if (stmt.type !== 'ExportDefaultDeclaration') continue;
    if (stmt.declaration == null) continue;
    return unwrapExportDefaultToArrayExpression(stmt.declaration);
  }
  return null;
}

export type AddReactRouterRouteToFileInput =
  | { kind?: 'route'; path: string; module: string }
  | { kind: 'index'; module: string };

export interface AddReactRouterRouteToFileResult {
  /** False when an equivalent entry was already present. */
  added: boolean;
  content: string;
}

/**
 * Inserts a `route(...)` or `index(...)` entry into a React Router `routes.ts` config
 * (`export default [ ... ] satisfies RouteConfig`), writing the file in place.
 *
 * New `route` entries are placed before the first `route('*', ...)` splat (if any) so the
 * catch-all remains last.
 */
export async function addReactRouterRouteToFile(
  routesFilePath: string,
  content: string,
  spec: AddReactRouterRouteToFileInput,
  write = true,
): Promise<AddReactRouterRouteToFileResult> {
  const parsed = await parse(routesFilePath, content, {
    lang: routesFilePath.endsWith('.tsx') ? 'tsx' : 'ts',
    astType: 'ts',
  });
  if (parsed.errors.length > 0) {
    throw new Error(
      `addReactRouterRouteToFile: failed to parse ${routesFilePath}:\n${parsed.errors.map((e) => e.message).join('\n')}`,
    );
  }

  const array = findReactRouterRoutesArray(parsed.program);
  if (!array) {
    throw new Error(
      `addReactRouterRouteToFile: no export default array found in ${routesFilePath}`,
    );
  }

  const elements: ReactRouterRoutesItem[] = [];
  for (const v of array.elements) {
    if (v && v.type !== 'SpreadElement') {
      const parsed = parseReactRouterRoutesItem(v);
      if (parsed) elements.push(parsed);
    }
  }

  if (spec.kind === 'index') {
    if (elements.some((element) => element.type === 'index')) {
      return { added: false, content };
    }
  } else if (elements.some((element) => element.type === 'route' && element.path === spec.path)) {
    return { added: false, content };
  }

  const line =
    spec.kind === 'index'
      ? `index(${tsSingleQuotedLiteral(spec.module)})`
      : `route(${tsSingleQuotedLiteral(spec.path)}, ${tsSingleQuotedLiteral(spec.module)})`;

  const s = new MagicString(content);
  const insertAt = elements.findLast(
    (element) => element.type !== 'route' || !element.path.endsWith('*'),
  );

  if (!insertAt) {
    s.appendRight(array.start + 1, `\n  ${line},\n`);
  } else {
    s.appendRight(insertAt.expression.end, `,\n  ${line}`);
  }

  const out = s.toString();
  if (write) {
    await fs.writeFile(routesFilePath, out, 'utf8');
  }

  return { added: true, content: out };
}
