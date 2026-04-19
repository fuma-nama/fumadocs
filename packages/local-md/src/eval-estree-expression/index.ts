/**
 * Based on `eval-estree-expression` by Jon Schlinkert.
 * MIT licensed.
 */
import type {
  Expression,
  Node as EstreeNode,
  Program,
  JSXAttribute,
  JSXSpreadAttribute,
  ExpressionStatement,
  ExportNamedDeclaration,
  ExportDefaultDeclaration,
  VariableDeclarator,
  VariableDeclaration,
  BlockStatement,
  ReturnStatement,
  Identifier,
  ThisExpression,
  Literal,
  RegExpLiteral,
  ArrayExpression,
  ObjectExpression,
  TemplateLiteral,
  TemplateElement,
  SequenceExpression,
  ConditionalExpression,
  UnaryExpression,
  BinaryExpression,
  LogicalExpression,
  MemberExpression,
  ChainExpression,
  CallExpression,
  NewExpression,
  ArrowFunctionExpression,
  FunctionExpression,
  AssignmentExpression,
  UpdateExpression,
  SpreadElement,
  JSXElement,
  JSXFragment,
  JSXExpressionContainer,
  JSXText,
  JSXSpreadChild,
} from 'estree-jsx';
import type { Key } from 'react';
import type * as JsxRuntime from 'react/jsx-runtime';

const UNSAFE_KEYS = new Set(['constructor', 'prototype', '__proto__', '__defineGetter__']);
const RETURN = Symbol('return');

type SupportedNode = EstreeNode;
type Context = Record<string, unknown>;

export interface EvaluateOptions {
  jsx?: Pick<typeof JsxRuntime, 'Fragment' | 'jsx' | 'jsxs'>;
}

interface ReturnValue {
  type: typeof RETURN;
  value: unknown;
}

function isSafeKey(value: unknown): value is string | number {
  return (
    (typeof value === 'string' || typeof value === 'number') && !UNSAFE_KEYS.has(String(value))
  );
}

function isReturnValue(value: unknown): value is ReturnValue {
  return typeof value === 'object' && value !== null && (value as ReturnValue).type === RETURN;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

export class ExpressionSync {
  private readonly exports = new Map<string, unknown>();

  constructor(private readonly options: EvaluateOptions = {}) {}

  evaluate(tree: Program | Expression, context: Context = {}) {
    return this.visit(tree, context, undefined);
  }

  getExports() {
    return Object.fromEntries(this.exports.entries());
  }

  private visit(node: SupportedNode, context: Context, parent: SupportedNode | undefined): unknown {
    const visitor = (
      this as unknown as Record<
        string,
        (node: SupportedNode, context: Context, parent?: SupportedNode) => unknown
      >
    )[node.type];
    if (typeof visitor !== 'function') {
      throw new TypeError(`visitor "${node.type}" is not supported`);
    }

    return visitor.call(this, node, context, parent);
  }

  private bindPattern(pattern: SupportedNode, value: unknown, context: Context): void {
    switch (pattern.type) {
      case 'Identifier': {
        if (!isSafeKey(pattern.name)) return;
        context[String(pattern.name)] = value;
        return;
      }

      case 'AssignmentPattern': {
        const next = value === undefined ? this.visit(pattern.right, context, pattern) : value;
        this.bindPattern(pattern.left, next, context);
        return;
      }

      case 'ArrayPattern': {
        const values = Array.isArray(value) ? value : [];
        const elements = pattern.elements;
        for (let index = 0; index < elements.length; index++) {
          const element = elements[index];
          if (!element) continue;

          if (element.type === 'RestElement') {
            this.bindPattern(element.argument, values.slice(index), context);
            return;
          }

          this.bindPattern(element, values[index], context);
        }
        return;
      }

      case 'ObjectPattern': {
        const object = isObject(value) ? value : {};
        const properties = pattern.properties ?? [];

        for (const property of properties) {
          if (property.type === 'RestElement') {
            const usedKeys = new Set(
              properties
                .filter((entry) => entry !== property && entry.type === 'Property')
                .map((entry) =>
                  entry.key.type === 'Identifier' ? String(entry.key.name) : undefined,
                )
                .filter((entry): entry is string => entry !== undefined),
            );
            const rest: Record<string, unknown> = {};
            for (const [key, item] of Object.entries(object)) {
              if (!usedKeys.has(key)) rest[key] = item;
            }
            this.bindPattern(property.argument, rest, context);
            continue;
          }

          const key = this.visit(property.key, context, property);
          const next = isSafeKey(key) ? object[key] : undefined;
          this.bindPattern(property.value, next, context);
        }
        return;
      }

      case 'RestElement': {
        this.bindPattern(pattern.argument, value, context);
        return;
      }

      default:
        throw new TypeError(`Pattern "${pattern.type}" is not supported`);
    }
  }

  private getPatternIdentifiers(pattern: SupportedNode): string[] {
    switch (pattern.type) {
      case 'Identifier':
        return [pattern.name];

      case 'AssignmentPattern':
        return this.getPatternIdentifiers(pattern.left);

      case 'ArrayPattern':
        return pattern.elements.flatMap((element) =>
          element == null
            ? []
            : element.type === 'RestElement'
              ? this.getPatternIdentifiers(element.argument)
              : this.getPatternIdentifiers(element),
        );

      case 'ObjectPattern':
        return pattern.properties.flatMap((property) => {
          if (property.type === 'RestElement') {
            return this.getPatternIdentifiers(property.argument);
          }

          return this.getPatternIdentifiers(property.value);
        });

      case 'RestElement':
        return this.getPatternIdentifiers(pattern.argument);

      default:
        return [];
    }
  }

  private readIdentifier(name: string, context: Context): unknown {
    if (!isSafeKey(name)) return undefined;
    if (name === 'undefined') return undefined;
    if (name === 'NaN') return Number.NaN;
    if (name === 'Infinity') return Number.POSITIVE_INFINITY;
    if (name in context) return context[name];
    throw new ReferenceError(`${name} is undefined`);
  }

  private resolveReference(node: SupportedNode, context: Context) {
    if (node.type === 'Identifier') {
      const key = node.name;
      return {
        get: () => this.readIdentifier(key, context),
        set: (value: unknown) => {
          if (!isSafeKey(key)) return value;
          context[key] = value;
          return value;
        },
      };
    }

    if (node.type === 'MemberExpression') {
      const object = this.visit(node.object, context, node);
      if (object == null && node.optional) {
        return {
          get: () => undefined,
          set: () => undefined,
        };
      }

      if (!isObject(object)) {
        throw new TypeError('Cannot assign to non-object member');
      }

      const property = this.visit(node.property, context, node);
      if (!isSafeKey(property)) {
        return {
          get: () => undefined,
          set: () => undefined,
        };
      }

      return {
        get: () => object[property],
        set: (value: unknown) => {
          object[property] = value;
          return value;
        },
      };
    }

    throw new TypeError(`Assignment target "${node.type}" is not supported`);
  }

  private resolveJsxName(node: SupportedNode, context: Context): unknown {
    switch (node.type) {
      case 'JSXIdentifier': {
        const name = node.name;
        if (/^[a-z]/.test(name) || name.includes('-')) return name;
        return this.readIdentifier(name, context);
      }

      case 'JSXMemberExpression': {
        const object = this.resolveJsxName(node.object, context);
        const propertyNode = node.property;
        const property = propertyNode.type === 'JSXIdentifier' ? propertyNode.name : undefined;
        if (!isObject(object) || !isSafeKey(property)) return undefined;
        return object[property];
      }

      case 'JSXNamespacedName':
        return `${node.namespace.name}:${node.name.name}`;

      default:
        return this.visit(node, context, undefined);
    }
  }

  private createJsxProps(
    attributes: (JSXAttribute | JSXSpreadAttribute)[],
    context: Context,
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    for (const attribute of attributes) {
      if (attribute.type === 'JSXSpreadAttribute') {
        Object.assign(props, this.visit(attribute.argument, context, attribute));
        continue;
      }

      const nameNode = attribute.name;
      const name =
        nameNode.type === 'JSXIdentifier'
          ? nameNode.name
          : `${nameNode.namespace.name}:${nameNode.name.name}`;

      if (attribute.value == null) {
        props[name] = true;
        continue;
      }

      if (typeof attribute.value !== 'object') {
        props[name] = attribute.value;
        continue;
      }

      props[name] = this.visit(attribute.value, context, attribute);
    }

    return props;
  }

  private createJsxChildren(
    children: (JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment)[],
    context: Context,
  ): unknown[] {
    const result: unknown[] = [];

    for (const child of children) {
      if (child.type === 'JSXSpreadChild') {
        const value = this.visit(child.expression, context, child as unknown as SupportedNode);
        if (value == null || value === false) continue;

        if (typeof value === 'string') {
          result.push(...value);
        } else if (isIterable(value)) {
          result.push(...value);
        } else {
          result.push(value);
        }
      } else {
        const value = this.visit(child, context, child);
        if (value === undefined || value === null || value === false) continue;
        result.push(value);
      }
    }

    return result;
  }

  private createJsxElement(type: unknown, props: Record<string, unknown>) {
    const jsx = this.options.jsx;
    if (!jsx) {
      throw new TypeError('Expected JSX runtime helpers in options.jsx');
    }

    const key = props.key == null ? undefined : props.key;
    if ('key' in props) delete props.key;

    const fn = Array.isArray(props.children) ? jsx.jsxs : jsx.jsx;
    const elementType = type as Parameters<typeof jsx.jsx>[0];
    return key ? fn(elementType, props, key as Key | undefined) : fn(elementType, props);
  }

  Program(node: Program, context: Context) {
    let result: unknown;

    for (const child of node.body ?? []) {
      result = this.visit(child, context, node);
      if (isReturnValue(result)) return result.value;
    }

    return result;
  }

  ExpressionStatement(node: ExpressionStatement, context: Context) {
    return this.visit(node.expression, context, node);
  }

  ExportNamedDeclaration(node: ExportNamedDeclaration, context: Context) {
    if (node.declaration) {
      const v = this.visit(node.declaration, context, node);

      if (node.declaration.type === 'VariableDeclaration') {
        for (const declaration of node.declaration.declarations) {
          for (const name of this.getPatternIdentifiers(declaration.id)) {
            this.exports.set(name, context[name]);
          }
        }
      }

      return v;
    }

    for (const specifier of node.specifiers) {
      if (specifier.type !== 'ExportSpecifier') continue;
      if (specifier.local.type !== 'Identifier') continue;

      const exportedName =
        specifier.exported.type === 'Identifier'
          ? specifier.exported.name
          : String(specifier.exported.value);
      this.exports.set(exportedName, context[specifier.local.name]);
    }

    return undefined;
  }

  ExportDefaultDeclaration(node: ExportDefaultDeclaration, context: Context) {
    if (node.declaration) {
      switch (node.declaration.type) {
        case 'ClassDeclaration':
        case 'FunctionDeclaration':
          throw new Error(`${node.declaration.type} is not supported`);
      }

      const v = this.visit(node.declaration, context, node);
      this.exports.set('default', v);
      return v;
    }
    return undefined;
  }

  ImportDeclaration() {
    return undefined;
  }

  VariableDeclaration(node: VariableDeclaration, context: Context) {
    let result: unknown;
    for (const declaration of node.declarations) {
      result = this.visit(declaration, context, node);
    }
    return result;
  }

  VariableDeclarator(node: VariableDeclarator, context: Context) {
    const value = node.init ? this.visit(node.init, context, node) : undefined;
    this.bindPattern(node.id, value, context);
    return value;
  }

  BlockStatement(node: BlockStatement, context: Context) {
    let result: unknown;
    for (const statement of node.body) {
      result = this.visit(statement, context, node);
      if (isReturnValue(result)) return result;
    }
    return result;
  }

  ReturnStatement(node: ReturnStatement, context: Context) {
    return {
      type: RETURN,
      value: node.argument ? this.visit(node.argument, context, node) : undefined,
    } satisfies ReturnValue;
  }

  Identifier(node: Identifier, context: Context) {
    return this.readIdentifier(node.name, context);
  }

  ThisExpression(_: ThisExpression, context: Context) {
    return context.this;
  }

  Literal(node: Literal) {
    return node.value;
  }

  StringLiteral(node: Literal) {
    return node.value;
  }

  NumericLiteral(node: Literal) {
    return node.value;
  }

  BooleanLiteral(node: Literal) {
    return node.value;
  }

  NullLiteral() {
    return null;
  }

  BigIntLiteral(node: Literal) {
    return BigInt(String(node.value));
  }

  RegExpLiteral(node: RegExpLiteral) {
    return new RegExp(node.regex.pattern, node.regex.flags);
  }

  ArrayExpression(node: ArrayExpression, context: Context) {
    const output: unknown[] = [];
    for (const element of node.elements) {
      if (!element) {
        output.push(undefined);
        continue;
      }

      const value = this.visit(element, context, node);
      if (element.type === 'SpreadElement' && Array.isArray(value)) {
        output.push(...value);
      } else {
        output.push(value);
      }
    }
    return output;
  }

  ObjectExpression(node: ObjectExpression, context: Context) {
    const output: Record<string, unknown> = {};

    for (const property of node.properties) {
      if (property.type === 'SpreadElement') {
        Object.assign(output, this.visit(property.argument, context, property));
        continue;
      }

      const key = this.visit(property.key, context, property);
      if (!isSafeKey(key)) continue;
      output[String(key)] = this.visit(property.value, context, property);
    }

    return output;
  }

  TemplateLiteral(node: TemplateLiteral, context: Context) {
    const quasis = node.quasis;
    const expressions = node.expressions;
    let output = '';

    for (let index = 0; index < expressions.length; index++) {
      output += String(this.visit(quasis[index], context, node) ?? '');
      output += String(this.visit(expressions[index], context, node) ?? '');
    }

    output += String(this.visit(quasis[quasis.length - 1], context, node) ?? '');
    return output;
  }

  TemplateElement(node: TemplateElement) {
    return node.value.cooked ?? '';
  }

  SequenceExpression(node: SequenceExpression, context: Context) {
    let result: unknown;
    for (const expression of node.expressions) {
      result = this.visit(expression, context, node);
    }
    return result;
  }

  ConditionalExpression(node: ConditionalExpression, context: Context) {
    return this.visit(node.test, context, node)
      ? this.visit(node.consequent, context, node)
      : this.visit(node.alternate, context, node);
  }

  UnaryExpression(node: UnaryExpression, context: Context) {
    const value = node.operator === 'delete' ? undefined : this.visit(node.argument, context, node);

    switch (node.operator) {
      case '!':
        return !value;
      case '+':
        return +Number(value);
      case '-':
        return -Number(value);
      case '~':
        return ~Number(value);
      case 'typeof':
        return typeof value;
      case 'void':
        return void value;
      case 'delete': {
        const reference = this.resolveReference(node.argument, context);
        return reference.set(undefined) === undefined;
      }
      default:
        throw new TypeError(`Unary operator "${node.operator}" is not supported`);
    }
  }

  BinaryExpression(node: BinaryExpression, context: Context) {
    const left = this.visit(node.left, context, node);

    switch (node.operator) {
      case '+':
        return (
          (left as number | string | bigint) + (this.visit(node.right, context, node) as never)
        );
      case '-':
        return Number(left) - Number(this.visit(node.right, context, node));
      case '*':
        return Number(left) * Number(this.visit(node.right, context, node));
      case '/':
        return Number(left) / Number(this.visit(node.right, context, node));
      case '%':
        return Number(left) % Number(this.visit(node.right, context, node));
      case '**':
        return Number(left) ** Number(this.visit(node.right, context, node));
      case '<':
        return (
          (left as number | string) < (this.visit(node.right, context, node) as number | string)
        );
      case '<=':
        return (
          (left as number | string) <= (this.visit(node.right, context, node) as number | string)
        );
      case '>':
        return (
          (left as number | string) > (this.visit(node.right, context, node) as number | string)
        );
      case '>=':
        return (
          (left as number | string) >= (this.visit(node.right, context, node) as number | string)
        );
      case '==':
        return left == this.visit(node.right, context, node);
      case '!=':
        return left != this.visit(node.right, context, node);
      case '===':
        return left === this.visit(node.right, context, node);
      case '!==':
        return left !== this.visit(node.right, context, node);
      case 'instanceof':
        return (
          left instanceof
          (this.visit(node.right, context, node) as new (...args: never[]) => unknown)
        );
      case 'in':
        return (left as string | number | symbol) in Object(this.visit(node.right, context, node));
      case '&':
        return Number(left) & Number(this.visit(node.right, context, node));
      case '|':
        return Number(left) | Number(this.visit(node.right, context, node));
      case '^':
        return Number(left) ^ Number(this.visit(node.right, context, node));
      case '<<':
        return Number(left) << Number(this.visit(node.right, context, node));
      case '>>':
        return Number(left) >> Number(this.visit(node.right, context, node));
      case '>>>':
        return Number(left) >>> Number(this.visit(node.right, context, node));
      default:
        throw new TypeError(`Binary operator "${node.operator}" is not supported`);
    }
  }

  LogicalExpression(node: LogicalExpression, context: Context) {
    const left = this.visit(node.left, context, node);

    switch (node.operator) {
      case '&&':
        return left && this.visit(node.right, context, node);
      case '||':
        return left || this.visit(node.right, context, node);
      case '??':
        return left ?? this.visit(node.right, context, node);
      default:
        throw new TypeError(`Logical operator "${node.operator}" is not supported`);
    }
  }

  MemberExpression(node: MemberExpression, context: Context) {
    const object = this.visit(node.object, context, node);
    if (object == null && node.optional) return undefined;
    if (object == null) throw new TypeError('Cannot read properties of undefined');

    const property = node.computed
      ? this.visit(node.property, context, node)
      : node.property.type === 'Identifier'
        ? node.property.name
        : undefined;
    if (!isSafeKey(property)) return undefined;

    const value = (object as Record<string | number, unknown>)[property];
    return typeof value === 'function' ? value.bind(object) : value;
  }

  ChainExpression(node: ChainExpression, context: Context) {
    return this.visit(node.expression, context, node);
  }

  CallExpression(node: CallExpression, context: Context) {
    const callee = this.visit(node.callee, context, node);
    if (typeof callee !== 'function') {
      throw new Error('invalid function');
    }

    const args: unknown[] = [];
    for (const argument of node.arguments) {
      const value = this.visit(argument, context, node);
      if (argument.type === 'SpreadElement' && Array.isArray(value)) {
        args.push(...value);
      } else {
        args.push(value);
      }
    }

    const scope =
      node.callee && node.callee.type === 'MemberExpression'
        ? this.visit(node.callee.object, context, node)
        : undefined;

    return Reflect.apply(callee, scope, args);
  }

  NewExpression(node: NewExpression, context: Context) {
    const callee = this.visit(node.callee, context, node);
    if (typeof callee !== 'function') {
      throw new TypeError('Functions are not supported');
    }

    const args = node.arguments.map((argument) => this.visit(argument, context, node));
    return new (callee as new (...args: never[]) => unknown)(...(args as never[]));
  }

  ArrowFunctionExpression(node: ArrowFunctionExpression, context: Context) {
    return (...args: unknown[]) => this.invokeFunction(node, context, args, context.this);
  }

  FunctionExpression(node: FunctionExpression, context: Context) {
    const invokeFunction = this.invokeFunction.bind(this);
    return function (this: unknown, ...args: unknown[]) {
      return invokeFunction(node, context, args, this);
    };
  }

  private invokeFunction(
    node: FunctionExpression | ArrowFunctionExpression,
    context: Context,
    args: unknown[],
    thisValue: unknown,
  ) {
    const scope = Object.create(context) as Context;
    scope.this = thisValue;

    const params = node.params;
    for (let index = 0; index < params.length; index++) {
      const parameter = params[index];
      if (parameter.type === 'RestElement') {
        this.bindPattern(parameter.argument, args.slice(index), scope);
        break;
      }

      this.bindPattern(parameter, args[index], scope);
    }

    const result =
      node.body.type === 'BlockStatement'
        ? this.visit(node.body, scope, node)
        : this.visit(node.body, scope, node);

    return isReturnValue(result) ? result.value : result;
  }

  AssignmentExpression(node: AssignmentExpression, context: Context) {
    const reference = this.resolveReference(node.left, context);
    const right = this.visit(node.right, context, node);
    const left = reference.get();

    switch (node.operator) {
      case '=':
        return reference.set(right);
      case '+=':
        return reference.set((left as number | string | bigint) + (right as never));
      case '-=':
        return reference.set(Number(left) - Number(right));
      case '*=':
        return reference.set(Number(left) * Number(right));
      case '/=':
        return reference.set(Number(left) / Number(right));
      case '%=':
        return reference.set(Number(left) % Number(right));
      case '&&=':
        return reference.set(left && right);
      case '||=':
        return reference.set(left || right);
      case '??=':
        return reference.set(left ?? right);
      default:
        throw new TypeError(`Assignment operator "${node.operator}" is not supported`);
    }
  }

  UpdateExpression(node: UpdateExpression, context: Context) {
    const reference = this.resolveReference(node.argument, context);
    const current = Number(reference.get());
    const next = node.operator === '++' ? current + 1 : current - 1;
    reference.set(next);
    return node.prefix ? next : current;
  }

  SpreadElement(node: SpreadElement, context: Context) {
    return this.visit(node.argument, context, node);
  }

  JSXElement(node: JSXElement, context: Context) {
    const opening = node.openingElement;
    const props = this.createJsxProps(opening.attributes, context);
    const children = this.createJsxChildren(node.children, context);
    if (children.length === 1) props.children = children[0];
    else if (children.length > 1) props.children = children;

    return this.createJsxElement(this.resolveJsxName(opening.name, context), props);
  }

  JSXFragment(node: JSXFragment, context: Context) {
    const props: Record<string, unknown> = {};
    const children = this.createJsxChildren(node.children, context);
    if (children.length === 1) props.children = children[0];
    else if (children.length > 1) props.children = children;

    return this.createJsxElement(this.options.jsx?.Fragment, props);
  }

  JSXAttribute(node: JSXAttribute, context: Context) {
    if (node.value == null) return true;
    return this.visit(node.value, context, node);
  }

  JSXExpressionContainer(node: JSXExpressionContainer, context: Context) {
    if (node.expression.type === 'JSXEmptyExpression') return undefined;
    return this.visit(node.expression, context, node);
  }

  JSXText(node: JSXText) {
    const collapsed = node.value.replace(/\s+/g, ' ');
    return collapsed.trim() === '' ? undefined : collapsed;
  }
}
