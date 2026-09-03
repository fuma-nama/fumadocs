import {
  type Checker,
  isBigIntLiteralType,
  isBooleanLiteralType,
  isIntersectionType,
  isLiteralType,
  isObjectType,
  isTypeReference,
  isUnionType,
  NodeBuilderFlags,
  type Project,
  SignatureKind,
  SymbolFlags,
  type Type,
  TypeFlags,
} from 'typescript/unstable/sync';
import {
  isEnumDeclaration,
  isNumericLiteral,
  isStringLiteral,
  type Node,
  SyntaxKind,
} from 'typescript/unstable/ast';
import type { LiteralNode, ObjectNode, TypeNode, UnionNode } from './types';
import { validate } from './validator';

export enum TypeToNodeFlag {
  None = 0,
  NoIntersection = 1 << 0,
}

export interface TypeTreeBuilder {
  typeToNode: (type: Type, location: Node, flag?: TypeToNodeFlag) => TypeNode;
}

export type Handler = (options: {
  type: Type;
  location: Node;
  flag: TypeToNodeFlag;

  builder: TypeTreeBuilder;
  /**
   * The TypeScript project (from `typescript/unstable/sync`) of the type, use `project.checker` for type checking.
   */
  project: Project;
  cache: Map<TypeToNodeFlag, WeakMap<Type, TypeNode>>;
  getCache: () => TypeNode | undefined;
  setCache: (value: TypeNode) => void;

  /**
   * start from the first handler
   */
  root: (type: Type, flag: TypeToNodeFlag, location?: Node) => TypeNode;
  /**
   * start from the next handler
   */
  next: (type: Type, flag: TypeToNodeFlag, location?: Node) => TypeNode;
}) => TypeNode;

/**
 * Private class members (`#name`) are exposed with their escaped name (`__#1@#name`) by TypeScript.
 */
function isPrivateName(name: string): boolean {
  return name.startsWith('#') || name.startsWith('__#');
}

function getLiteralValue(checker: Checker, type: Type): string | number | boolean | bigint {
  if (isBooleanLiteralType(type)) {
    return typeof type.value === 'boolean' ? type.value : checker.typeToString(type) === 'true';
  }

  if (isBigIntLiteralType(type)) {
    const value: unknown = type.value;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'object' && value !== null && 'base10Value' in value) {
      const { negative, base10Value } = value as { negative?: boolean; base10Value: string };
      return BigInt(`${negative ? '-' : ''}${base10Value}`);
    }
    return BigInt(value as string | number);
  }

  return (type as { value?: string | number }).value ?? checker.typeToString(type);
}

const baseHandler: Handler = ({ type, flag, location, project, setCache, root }) => {
  const { checker } = project;
  const { flags } = type;

  // Handle primitive types
  if (flags & TypeFlags.String) return { type: 'string' };
  if (flags & TypeFlags.Number) return { type: 'number' };
  if (flags & TypeFlags.Boolean) return { type: 'boolean' };
  if (flags & TypeFlags.BigInt) return { type: 'bigint' };
  const symbol = type.getSymbol();
  if (symbol && symbol.name === 'Date') return { type: 'date' };
  if (flags & TypeFlags.Undefined) return { type: 'undefined' };
  if (flags & TypeFlags.Unknown) return { type: 'unknown' };
  if (flags & TypeFlags.Null) return { type: 'null' };
  if (flags & TypeFlags.Never || checker.getSignaturesOfType(type, SignatureKind.Call).length > 0)
    return { type: 'never' };

  if (isUnionType(type)) {
    const result: TypeNode = {
      type: 'union',
      types: [],
    };
    setCache(result);
    for (const t of type.getTypes()) result.types.push(root(t, flag));
    Object.assign(result, unwrapUnion(result));
    return result;
  }

  if (isIntersectionType(type) && (flag & TypeToNodeFlag.NoIntersection) === 0) {
    const intersectionTypes = type.getTypes();
    const result: TypeNode = {
      type: 'intersection',
      members: [],
      intersection: { type: 'never' },
    };
    setCache(result);
    result.intersection = root(type, flag | TypeToNodeFlag.NoIntersection);
    for (const t of intersectionTypes) {
      const member = root(t, flag);
      if (member.type !== 'never') result.members.push(member);
    }
    return result;
  }

  if (isLiteralType(type)) {
    // Handle literals
    return {
      type: 'literal',
      value: getLiteralValue(checker, type),
    };
  }

  if (checker.isArrayType(type)) {
    // Handle arrays
    const elementType = isTypeReference(type) ? checker.getTypeArguments(type)[0] : undefined;

    const result: TypeNode = {
      type: 'array',
      elementType: { type: 'never' },
    };
    setCache(result);
    result.elementType = elementType ? root(elementType, flag) : { type: 'unknown' };
    return result;
  }

  if (checker.isTupleType(type)) {
    // Convert tuple to array with union element type
    const elements = isTypeReference(type) ? checker.getTypeArguments(type) : [];
    if (elements.length === 0) {
      return {
        type: 'array',
        elementType: { type: 'unknown' },
      };
    }

    const result: TypeNode = {
      type: 'array',
      elementType: { type: 'never' },
    };
    setCache(result);
    result.elementType = unwrapUnion({
      type: 'union',
      types: elements.map((t) => root(t, flag)),
    });
    return result;
  }

  // Handle enums
  if (symbol && symbol.flags & SymbolFlags.Enum) {
    const enumDeclaration = symbol.valueDeclaration?.resolve(project);
    if (enumDeclaration && isEnumDeclaration(enumDeclaration)) {
      const members = enumDeclaration.members.map((member) => {
        const name = member.name.getText();
        const initializer = member.initializer;
        let value: unknown = name;

        if (initializer) {
          if (isStringLiteral(initializer)) {
            value = initializer.getText().slice(1, -1);
          } else if (isNumericLiteral(initializer)) {
            value = Number.parseFloat(initializer.getText());
          } else if (initializer.kind === SyntaxKind.TrueKeyword) {
            value = true;
          } else if (initializer.kind === SyntaxKind.FalseKeyword) {
            value = false;
          }
        }

        return {
          label: name,
          value,
        };
      });

      return {
        type: 'enum',
        members,
      };
    }
  }

  // Handle objects and interfaces
  const properties = checker.getPropertiesOfType(type);
  if (isObjectType(type) || properties.length > 0) {
    const alias = type.getAliasSymbol();
    const aliasTypeArguments = type.getAliasTypeArguments();
    const result: TypeNode = {
      type: 'object',
      displayName: alias && aliasTypeArguments.length === 0 ? alias.name : undefined,
      properties: [],
    };
    setCache(result);

    for (const prop of properties) {
      // Skip private properties
      if (isPrivateName(prop.name)) continue;

      const propType = checker.getTypeOfSymbolAtLocation(prop, location);
      let child = root(propType, flag, prop.valueDeclaration?.resolve(project));
      if (child.type === 'union') {
        child = unwrapUnion({
          ...child,
          types: child.types.filter((t) => t.type !== 'undefined'),
        });
      } else if (child.type === 'undefined') {
        continue;
      }

      if (child.type !== 'never') {
        result.properties.push({
          name: prop.name,
          type: child,
          required: (prop.flags & SymbolFlags.Optional) === 0,
        });
      }
    }
    return result;
  }

  return {
    type: 'never',
    displayName: checker.typeToString(
      type,
      location,
      NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope,
    ),
  };
};

export const literalEnumHandler: Handler = ({ type, flag, next }) => {
  const result = next(type, flag);
  if (result.type !== 'union') return result;

  const literalTypes: LiteralNode[] = [];
  const otherTypes: TypeNode[] = [];
  for (const t of result.types) {
    (t.type === 'literal' ? literalTypes : otherTypes).push(t);
  }
  if (literalTypes.length <= 1) return result;

  const enumNode: TypeNode = {
    type: 'enum',
    members: literalTypes.map((t) => ({
      label: JSON.stringify(t.value),
      value: t.value,
    })),
  };
  if (otherTypes.length > 0) {
    result.types = [enumNode, ...otherTypes];
  } else {
    Object.assign(result, enumNode);
  }

  return result;
};

export function createTypeTreeBuilder(project: Project, customHandlers: Handler[] = []) {
  const handlers: Handler[] = [...customHandlers, baseHandler];

  function callHandler(
    type: Type,
    location: Node,
    flag: TypeToNodeFlag,
    index = 0,
    cache: Map<TypeToNodeFlag, WeakMap<Type, TypeNode>> = new Map(),
  ): TypeNode {
    const cached = cache.get(flag)?.get(type);
    if (cached) return cached;
    const handler = handlers[index];
    if (!handler) return { type: 'never' };

    return handler({
      project,
      builder,
      cache,
      type,
      location,
      flag,
      getCache() {
        return cache.get(flag)?.get(type);
      },
      setCache(value) {
        let typeCache = cache.get(flag);
        if (!typeCache) {
          typeCache = new WeakMap();
          cache.set(flag, typeCache);
        }
        typeCache.set(type, value);
      },
      next(type, flag, l = location) {
        return callHandler(type, l, flag, index + 1, cache);
      },
      root(type, flag, l = location) {
        return callHandler(type, l, flag, 0, cache);
      },
    });
  }

  const builder: TypeTreeBuilder = {
    typeToNode(type, location, flag = TypeToNodeFlag.None) {
      return callHandler(type, location, flag);
    },
  };

  return builder;
}

/**
 * collapse controls into a deterministic state when certain values are known & immutable:
 * - collapse determined unions
 * - remove immutable controls
 * @returns modified node (modification is in place)
 */
export function collapse(node: TypeNode, value: unknown): TypeNode {
  if (node.type === 'object') {
    if (typeof value !== 'object' || value === null) return node;
    const newProps: ObjectNode['properties'] = [];
    for (const prop of node.properties) {
      if (!(prop.name in value)) {
        newProps.push(prop);
        continue;
      }

      prop.type = collapse(prop.type, value[prop.name as never]);
      if (prop.type.type !== 'never') newProps.push(prop);
    }
    node.properties = newProps;
    return node;
  }

  if (node.type === 'union') {
    const newTypes: TypeNode[] = [];
    for (const member of node.types) {
      if (validate(member, value)) newTypes.push(collapse(member, value));
    }
    node.types = newTypes;
    return unwrapUnion(node);
  }

  return { type: 'never' };
}

/** simplify union */
export function unwrapUnion(union: UnionNode): TypeNode {
  const members = new Set<TypeNode>();
  for (let t of union.types) {
    if (t.type === 'union') t = unwrapUnion(t);

    switch (t.type) {
      case 'unknown':
        return t;
      case 'never':
        break;
      case 'union':
        for (const child of t.types) members.add(child);
        break;
      default:
        members.add(t);
    }
  }

  if (members.size === 0) return { type: 'never' };
  if (members.size === 1) return members.values().next().value!;
  union.types = Array.from(members);
  return union;
}
