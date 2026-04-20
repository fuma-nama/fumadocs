import type { Expression, ExpressionStatement, Pattern, Statement } from 'estree-jsx';
import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';
import type { JSExecutor, JSExecutorConfig } from './executor';

const INTERNAL_VAR_NAMES = {
  jsx: '_jsx',
  jsxs: '_jsxs',
  fragment: '_Fragment',
  exports: '__fumadocs_exports',
} as const;

/**
 * Execute JavaScript with `new Function()`, this is unsafe.
 */
export function executorNative(options: JSExecutorConfig): JSExecutor {
  const { filePath, jsx } = options;
  const exports: Record<string, unknown> = {};
  const globalContext: Record<string, unknown> = {
    [INTERNAL_VAR_NAMES.exports]: exports,
    [INTERNAL_VAR_NAMES.jsx]: jsx.jsx,
    [INTERNAL_VAR_NAMES.jsxs]: jsx.jsxs,
    [INTERNAL_VAR_NAMES.fragment]: jsx.Fragment,
  };

  function generateExportAssign(name: string, expression: Expression): ExpressionStatement {
    return {
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        left: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: INTERNAL_VAR_NAMES.exports },
          property: { type: 'Identifier', name },
          computed: false,
          optional: false,
        },
        right: expression,
        operator: '=',
      },
    };
  }

  function allNames(pattern: Pattern): string[] {
    switch (pattern.type) {
      case 'Identifier':
        return [pattern.name];
      case 'ArrayPattern': {
        const out: string[] = [];
        for (const element of pattern.elements) {
          if (element) out.push(...allNames(element));
        }
        return out;
      }
      case 'AssignmentPattern':
        return allNames(pattern.left);
      case 'MemberExpression':
        return [];
      case 'ObjectPattern': {
        const out: string[] = [];
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') {
            if ('value' in prop && typeof prop.value === 'string') out.push(prop.value);
            else if ('name' in prop && typeof prop.name === 'string') out.push(prop.name);
          } else {
            out.push(...allNames(prop.argument));
          }
        }
        return out;
      }
      case 'RestElement':
        return allNames(pattern.argument);
    }
  }

  return {
    expression(expression, context) {
      buildJsx(expression, { importSource: null, runtime: 'automatic' });

      const code = toJs(
        {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ReturnStatement',
              argument: expression,
            },
          ],
        },
        { filePath },
      ).value;
      return execute(code, { ...globalContext, ...context });
    },
    program(program, context) {
      buildJsx(program, { importSource: null, runtime: 'automatic' });

      program.body = program.body.flatMap((statement) => {
        if (statement.type === 'ExportAllDeclaration') {
          throw new Error(`${statement.type} is not supported`);
        }

        if (statement.type === 'ExportDefaultDeclaration') {
          if (!statement.declaration) {
            throw new Error(`${statement.type} is not supported without an initializer`);
          }

          let right: Expression;
          switch (statement.declaration.type) {
            case 'ClassDeclaration':
              right = {
                ...statement.declaration,
                type: 'ClassExpression',
              };
              break;
            case 'FunctionDeclaration':
              right = {
                ...statement.declaration,
                type: 'FunctionExpression',
              };
              break;
            default:
              right = statement.declaration;
          }
          return generateExportAssign('default', right);
        }

        if (statement.type === 'ExportNamedDeclaration') {
          if (!statement.declaration) {
            throw new Error(`${statement.type} is not supported without an initializer`);
          }

          switch (statement.declaration.type) {
            case 'ClassDeclaration':
            case 'FunctionDeclaration':
              return [
                statement.declaration,
                generateExportAssign(statement.declaration.id.name, statement.declaration.id),
              ];
            case 'VariableDeclaration': {
              const out: Statement[] = [statement.declaration];
              for (const d of statement.declaration.declarations) {
                for (const name of allNames(d.id)) {
                  out.push(generateExportAssign(name, { type: 'Identifier', name }));
                }
              }
              return out;
            }
          }
        }

        return statement;
      });

      return execute(toJs(program, { filePath }).value, {
        ...globalContext,
        ...context,
      });
    },
    getExports() {
      return exports;
    },
  };
}

function execute(code: string, context: Record<string, unknown>) {
  const argNames = Object.keys(context);
  const argValues = Object.values(context);
  const evaluator = new Function(...argNames, code);
  return evaluator(...argValues);
}
