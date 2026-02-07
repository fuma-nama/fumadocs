import { Type, Node, ts, type Project } from 'ts-morph';
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

const baseHandler: Handler = ({ type, flag, location, setCache, root }) => {
  // Handle primitive types
  if (type.isString()) return { type: 'string' };
  if (type.isNumber()) return { type: 'number' };
  if (type.isBoolean()) return { type: 'boolean' };
  if (type.isBigInt()) return { type: 'bigint' };
  const symbol = type.getSymbol();
  if (symbol && symbol.getName() === 'Date') return { type: 'date' };
  if (type.isUndefined()) return { type: 'undefined' };
  if (type.isUnknown()) return { type: 'unknown' };
  if (type.isNull()) return { type: 'null' };
  if (type.isNever() || type.getCallSignatures().length > 0) return { type: 'never' };

  if (type.isUnion()) {
    const result: TypeNode = {
      type: 'union',
      types: [],
    };
    setCache(result);
    for (const t of type.getUnionTypes()) result.types.push(root(t, flag));
    Object.assign(result, unwrapUnion(result));
    return result;
  }

  if (type.isIntersection() && (flag & TypeToNodeFlag.NoIntersection) === 0) {
    const intersectionTypes = type.getIntersectionTypes();
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

  if (type.isLiteral()) {
    let value: string | boolean | bigint | number;
    if (type.isBooleanLiteral()) {
      value = type.getText() === 'true';
    } else if (type.isBigIntLiteral()) {
      value = BigInt((type.getLiteralValue() as ts.PseudoBigInt).base10Value);
    } else {
      value = type.getLiteralValue() as string | number;
    }

    // Handle literals
    return {
      type: 'literal',
      value,
    };
  }

  if (type.isArray() || type.isReadonlyArray()) {
    // Handle arrays
    const elementType = type.getArrayElementType();

    const result: TypeNode = {
      type: 'array',
      elementType: { type: 'never' },
    };
    setCache(result);
    result.elementType = elementType ? root(elementType, flag) : { type: 'unknown' };
    return result;
  }

  if (type.isTuple()) {
    // Convert tuple to array with union element type
    const elements = type.getTupleElements();
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
  const enumSymbol = type.getSymbol();
  if (enumSymbol && enumSymbol.getFlags() & ts.SymbolFlags.Enum) {
    const enumDeclaration = enumSymbol.getValueDeclaration();
    if (enumDeclaration && Node.isEnumDeclaration(enumDeclaration)) {
      const members = enumDeclaration.getMembers().map((member) => {
        const name = member.getName();
        const initializer = member.getInitializer();
        let value: unknown = name;

        if (initializer) {
          if (Node.isStringLiteral(initializer)) {
            value = initializer.getText().slice(1, -1);
          } else if (Node.isNumericLiteral(initializer)) {
            value = Number.parseFloat(initializer.getText());
          } else if (Node.isTrueLiteral(initializer)) {
            value = true;
          } else if (Node.isFalseLiteral(initializer)) {
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
  if (type.isObject() || type.isClassOrInterface() || type.getProperties().length > 0) {
    const properties = type.getProperties();
    const alias = type.getAliasSymbol();
    const aliasTypeArguments = type.getAliasTypeArguments();
    const result: TypeNode = {
      type: 'object',
      displayName: alias && aliasTypeArguments.length === 0 ? alias.getName() : undefined,
      properties: [],
    };
    setCache(result);

    for (const prop of properties) {
      // Skip private properties
      if (prop.getName().startsWith('#')) continue;

      const propType = prop.getTypeAtLocation(location);
      let child = root(propType, flag, prop.getValueDeclaration());
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
          name: prop.getName(),
          type: child,
          required: !prop.isOptional(),
        });
      }
    }
    return result;
  }

  return {
    type: 'never',
    displayName: type.getText(location, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
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
