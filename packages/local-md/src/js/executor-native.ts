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
  Program,
} from 'estree-jsx';
import type { Handler, Handlers, State } from 'estree-util-to-js';
import { toJs } from 'estree-util-to-js';
import type * as JsxRuntime from 'react/jsx-runtime';
import { JSExecutor } from './executor';

const JSX_VAR_NAMES = {
  jsx: '__fumadocs_jsx',
  jsxs: '__fumadocs_jsxs',
  fragment: '__fumadocs_fragment',
} as const;

type Generator = ThisParameterType<Handler>;

interface NativeExecutorOptions {
  jsx: typeof JsxRuntime;
}

const jsxHandlers: Handlers = {
  JSXElement(node, state) {
    return writeJsxElement.call(this as Generator, node, state);
  },
  JSXFragment(node, state) {
    return writeJsxFragment.call(this as Generator, node, state);
  },
};

export function executorNative(options?: NativeExecutorOptions): JSExecutor {
  const jsxContext = options?.jsx
    ? {
        [JSX_VAR_NAMES.jsx]: options.jsx.jsx,
        [JSX_VAR_NAMES.jsxs]: options.jsx.jsxs,
        [JSX_VAR_NAMES.fragment]: options.jsx.Fragment,
      }
    : {};

  return {
    expression(expression, context) {
      const code = serializeExpression(expression);
      return executeExpression(code, { ...context, ...jsxContext });
    },
    program(program, context) {
      const code = serializeProgram(program);
      return execute(code, { ...context, ...jsxContext });
    },
    getExports() {
      return {};
    },
  };
}

function serializeExpression(expression: Expression): string {
  const code = toJs(
    {
      type: 'Program',
      sourceType: 'module',
      body: [
        {
          type: 'ExpressionStatement',
          expression,
        } satisfies ExpressionStatement,
      ],
    },
    { handlers: jsxHandlers },
  ).value;

  return code.replace(/;\s*$/, '');
}

function serializeProgram(program: Program): string {
  return toJs(program, { handlers: jsxHandlers }).value;
}

function execute(code: string, context: Record<string, unknown>) {
  const argNames = Object.keys(context);
  const argValues = Object.values(context);
  const evaluator = new Function(...argNames, code);
  return evaluator(...argValues);
}

function executeExpression(code: string, context: Record<string, unknown>) {
  return execute(`return (${code});`, context);
}

function writeJsxElement(this: Generator, node: JSXElement, state: State) {
  const children = normalizeJsxChildren(node.children);
  const hasArrayChildren =
    children.length > 1 || children.some((child) => child.type === 'JSXSpreadChild');
  const runtime = hasArrayChildren ? JSX_VAR_NAMES.jsxs : JSX_VAR_NAMES.jsx;

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
  const runtime = hasArrayChildren ? JSX_VAR_NAMES.jsxs : JSX_VAR_NAMES.jsx;

  state.write(`${runtime}(${JSX_VAR_NAMES.fragment}, `, node);
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
      if (/^[a-z]/.test(node.name) || node.name.includes('-')) {
        state.write(JSON.stringify(node.name), node);
        return;
      }

      state.write(node.name, node);
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
    if (/^[A-Za-z_$][\w$]*$/.test(node.name)) {
      state.write(node.name, node);
    } else {
      state.write(JSON.stringify(node.name), node);
    }
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
