import type {
  Expression,
  ExpressionStatement,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXSpreadAttribute,
  JSXSpreadChild,
  JSXText,
  Pattern,
  Program,
  Statement,
} from 'estree-jsx';
import type { Handler, Handlers, State } from 'estree-util-to-js';
import { toJs } from 'estree-util-to-js';
import type { JSExecutor, JSExecutorConfig } from './executor';

const INTERNAL_VAR_NAMES = {
  jsx: '__fumadocs_jsx',
  jsxs: '__fumadocs_jsxs',
  fragment: '__fumadocs_fragment',
  exports: '__fumadocs_exports',
} as const;

type Generator = ThisParameterType<Handler>;

const jsxHandlers: Handlers = {
  JSXElement(node, state) {
    return writeJsxElement.call(this as Generator, node, state);
  },
  JSXFragment(node, state) {
    return writeJsxFragment.call(this as Generator, node, state);
  },
};

/**
 * Execute JavaScript with `new Function()`, this is unsafe.
 */
export function executorNative(options: JSExecutorConfig): JSExecutor {
  const { filePath, jsx } = options;
  const exports: Record<string, unknown> = {};
  const globalContext: Record<string, unknown> = {
    [INTERNAL_VAR_NAMES.exports]: exports,
  };

  if (jsx) {
    Object.assign(globalContext, {
      [INTERNAL_VAR_NAMES.jsx]: jsx.jsx,
      [INTERNAL_VAR_NAMES.jsxs]: jsx.jsxs,
      [INTERNAL_VAR_NAMES.fragment]: jsx.Fragment,
    });
  }

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
        { filePath, handlers: jsxHandlers },
      ).value;
      return execute(code, { ...globalContext, ...context });
    },
    program(program, context) {
      const cloned: Program = { ...program };
      cloned.body = cloned.body.flatMap((statement) => {
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

      return execute(toJs(cloned, { filePath, handlers: jsxHandlers }).value, {
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

function writeJsxElement(this: Generator, node: JSXElement, state: State) {
  const children = normalizeJsxChildren(node.children);
  const hasArrayChildren =
    children.length > 1 || children.some((child) => child.type === 'JSXSpreadChild');
  const runtime = hasArrayChildren ? INTERNAL_VAR_NAMES.jsxs : INTERNAL_VAR_NAMES.jsx;

  state.write(`${runtime}(`, node);
  writeJsxType.call(this, node.openingElement.name, state);
  state.write(', ');
  writeJsxProps.call(this, node.openingElement.attributes, children, state);
  state.write(')');
}

function writeJsxFragment(this: Generator, node: JSXFragment, state: State) {
  const children = normalizeJsxChildren(node.children);
  const hasArrayChildren =
    children.length > 1 || children.some((child) => child.type === 'JSXSpreadChild');
  const runtime = hasArrayChildren ? INTERNAL_VAR_NAMES.jsxs : INTERNAL_VAR_NAMES.jsx;

  state.write(`${runtime}(${INTERNAL_VAR_NAMES.fragment}, `, node);
  writeJsxProps.call(this, [], children, state);
  state.write(')');
}

function writeJsxType(
  this: Generator,
  node: JSXIdentifier | JSXMemberExpression | JSXNamespacedName,
  state: State,
) {
  switch (node.type) {
    case 'JSXIdentifier':
      state.write(JSON.stringify(node.name), node);
      return;

    case 'JSXMemberExpression':
      writeJsxType.call(this, node.object, state);
      state.write('.');
      writeJsxType.call(this, node.property, state);
      return;

    case 'JSXNamespacedName':
      state.write(JSON.stringify(`${node.namespace.name}:${node.name.name}`), node);
      return;
  }
}

function writeJsxProps(
  this: Generator,
  attributes: Array<JSXAttribute | JSXSpreadAttribute>,
  children: Array<JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment>,
  state: State,
) {
  const entries: Array<() => void> = [];

  for (const attribute of attributes) {
    if (attribute.type === 'JSXSpreadAttribute') {
      entries.push(() => {
        state.write('...');
        this[attribute.argument.type](attribute.argument, state);
      });
      continue;
    }

    entries.push(() => {
      writeObjectKey(attribute.name, state);
      state.write(': ');
      writeJsxAttributeValue.call(this, attribute, state);
    });
  }

  if (children.length > 0) {
    entries.push(() => {
      state.write('children: ');

      if (children.length === 1 && children[0].type !== 'JSXSpreadChild') {
        writeJsxChild.call(this, children[0], state);
        return;
      }

      state.write('[');
      let index = -1;

      while (++index < children.length) {
        if (index > 0) state.write(', ');

        const child = children[index];
        if (child.type === 'JSXSpreadChild') {
          state.write('...');
          this[child.expression.type](child.expression, state);
        } else {
          writeJsxChild.call(this, child, state);
        }
      }

      state.write(']');
    });
  }

  state.write('{');
  let index = -1;
  while (++index < entries.length) {
    if (index > 0) state.write(', ');
    entries[index]();
  }
  state.write('}');
}

function writeObjectKey(node: JSXAttribute['name'], state: State) {
  if (node.type === 'JSXIdentifier') {
    state.write(JSON.stringify(node.name), node);
    return;
  }

  state.write(JSON.stringify(`${node.namespace.name}:${node.name.name}`), node);
}

function writeJsxAttributeValue(this: Generator, node: JSXAttribute, state: State) {
  if (node.value === null) {
    state.write('true', node);
    return;
  }

  switch (node.value.type) {
    case 'Literal':
      this.Literal(node.value, state);
      return;

    case 'JSXExpressionContainer':
      if (node.value.expression.type === 'JSXEmptyExpression') {
        state.write('undefined', node.value);
      } else {
        this[node.value.expression.type](node.value.expression, state);
      }
      return;

    case 'JSXElement':
    case 'JSXFragment':
      writeJsxChild.call(this, node.value, state);
      return;
  }
}

function writeJsxChild(
  this: Generator,
  node: JSXText | JSXExpressionContainer | JSXElement | JSXFragment,
  state: State,
) {
  switch (node.type) {
    case 'JSXText':
      state.write(JSON.stringify(node.value), node);
      return;

    case 'JSXExpressionContainer':
      if (node.expression.type === 'JSXEmptyExpression') {
        state.write('undefined', node.expression);
      } else {
        this[node.expression.type](node.expression, state);
      }
      return;

    case 'JSXElement':
      writeJsxElement.call(this, node, state);
      return;

    case 'JSXFragment':
      writeJsxFragment.call(this, node, state);
      return;
  }
}

function normalizeJsxChildren(
  children: Array<JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment>,
) {
  const result: Array<
    JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment
  > = [];

  for (const child of children) {
    if (child.type === 'JSXText') {
      const value = child.value.replace(/\s+/g, ' ').trim();
      if (value.length === 0) continue;
      result.push({ ...child, value });
      continue;
    }

    if (child.type === 'JSXExpressionContainer' && child.expression.type === 'JSXEmptyExpression') {
      continue;
    }

    result.push(child);
  }

  return result;
}
