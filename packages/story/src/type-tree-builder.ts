import { Type, Node, ts } from 'ts-morph';
import type { LiteralNode, TypeNode, UnionNode } from './types';

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
  cache: Map<TypeToNodeFlag, WeakMap<Type, TypeNode>>;
  getCache: () => TypeNode | undefined;
  setCache: (value: TypeNode) => void;

  /**
   * start from the first handler
   */
  root: (type: Type, location: Node, flag: TypeToNodeFlag) => TypeNode;
  /**
   * start from the next handler
   */
  next: (type: Type, location: Node, flag: TypeToNodeFlag) => TypeNode;
}) => TypeNode;

const baseHandler: Handler = ({ type, location, flag, getCache, setCache, root }) => {
  const done = getCache();
  if (done) return done;

  if (type.isUndefined()) {
    return { type: 'undefined' };
  }

  if (type.isNull()) {
    return { type: 'null' };
  }

  if (type.isNever() || type.getCallSignatures().length > 0) return { type: 'never' };

  if (type.isUnion()) {
    const result: TypeNode = {
      type: 'union',
      types: [],
    };
    setCache(result);
    for (const t of type.getUnionTypes()) {
      const item = root(t, location, flag);
      if (item.type !== 'never') result.types.push(item);
    }
    if (result.types.length === 0) Object.assign(result, { type: 'never' } satisfies TypeNode);
    else if (result.types.length === 1) Object.assign(result, result.types[0]);
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
    result.intersection = root(type, location, flag | TypeToNodeFlag.NoIntersection);
    for (const t of intersectionTypes) {
      const member = root(t, location, flag);
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
    result.elementType = elementType ? root(elementType, location, flag) : { type: 'unknown' };
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
    const elementTypes = elements.map((t) => root(t, location, flag));
    if (elementTypes.length > 0)
      result.elementType =
        elementTypes.length > 1
          ? {
              type: 'union',
              types: elementTypes,
            }
          : elementTypes[0];
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
  if (type.isObject() || type.isClassOrInterface()) {
    const properties = type.getProperties();
    const result: TypeNode = {
      type: 'object',
      properties: [],
    };
    setCache(result);

    for (const prop of properties) {
      // Skip private properties
      if (prop.getName().startsWith('#')) {
        continue;
      }
      const propType = prop.getTypeAtLocation(location);
      const isOptional = prop.isOptional();
      let child = root(propType, location, flag);
      if (child.type === 'union') {
        child = unwrapUnion({
          ...child,
          types: child.types.filter((t) => t.type !== 'undefined'),
        });
      }
      if (child.type === 'never' || child.type === 'undefined') continue;
      result.properties.push({
        name: prop.getName(),
        type: child,
        required: !isOptional,
      });
    }
    return result;
  }

  // Handle primitive types
  if (type.isString()) return { type: 'string' };
  if (type.isNumber()) return { type: 'number' };
  if (type.isBoolean()) return { type: 'boolean' };
  if (type.isBigInt()) return { type: 'bigint' };

  // Fallback: return unknown with type name
  return {
    type: 'unknown',
    displayName: type.getText(location, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
  };
};

export const literalEnumHandler: Handler = ({ type, location, flag, next }) => {
  const result = next(type, location, flag);
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

export function createTypeTreeBuilder(customHandlers: Handler[] = []) {
  const handlers: Handler[] = [...customHandlers, baseHandler];

  function callHandler(
    type: Type,
    location: Node,
    flag: TypeToNodeFlag,
    index = 0,
    cache: Map<TypeToNodeFlag, WeakMap<Type, TypeNode>> = new Map(),
  ): TypeNode {
    const handler = handlers[index];
    if (!handler) return { type: 'never' };

    return handler({
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
      next(type, location, flag) {
        return callHandler(type, location, flag, index + 1, cache);
      },
      root(type, location, flag) {
        return callHandler(type, location, flag, 0, cache);
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

function unwrapUnion(union: UnionNode): TypeNode {
  const types = union.types;
  if (types.length === 0) return { type: 'never' };
  if (types.length === 1) return types[0];
  return union;
}
