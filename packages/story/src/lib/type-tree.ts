import { type Type, type TypeChecker, Node, ts } from 'ts-morph';
import type { TypeNode, ObjectNode, UnionNode } from './types';

export function typeToNode(type: Type, checker: TypeChecker, location?: Node): TypeNode {
  // Handle undefined
  if (type.isUndefined()) {
    return { type: 'undefined' };
  }

  // Handle null
  if (type.isNull()) {
    return { type: 'null' };
  }

  // Handle union types
  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes();
    // Filter out undefined and null for optional properties
    const filteredTypes = unionTypes.filter((t) => !t.isUndefined() && !t.isNull());

    if (filteredTypes.length === 0) {
      return { type: 'undefined' };
    }

    if (filteredTypes.length === 1) {
      return typeToNode(filteredTypes[0]!, checker, location);
    }

    return {
      type: 'union',
      types: filteredTypes.map((t) => typeToNode(t, checker, location)),
    };
  }

  // Handle intersection types
  if (type.isIntersection()) {
    const intersectionTypes = type.getIntersectionTypes();
    return {
      type: 'intersection',
      types: intersectionTypes.map((t) => typeToNode(t, checker, location)),
    };
  }

  // Handle string literal
  if (type.isStringLiteral()) {
    return {
      type: 'literal',
      value: type.getLiteralValue() as string,
    };
  }

  // Handle number literal
  if (type.isNumberLiteral()) {
    return {
      type: 'literal',
      value: type.getLiteralValue() as number,
    };
  }

  // Handle boolean literal
  const booleanFlags = type.getFlags();
  if (booleanFlags & ts.TypeFlags.BooleanLiteral) {
    // Check if it's true or false literal
    const typeText = type.getText(location);
    const value = typeText === 'true';
    return {
      type: 'literal',
      value,
    };
  }

  // Handle arrays
  if (type.isArray() || type.isReadonlyArray()) {
    const elementType = type.getArrayElementType();
    if (elementType) {
      return {
        type: 'array',
        elementType: typeToNode(elementType, checker, location),
      };
    }
    return {
      type: 'array',
      elementType: { type: 'unknown', typeName: 'unknown' },
    };
  }

  // Handle tuples
  if (type.isTuple()) {
    // Convert tuple to array with union element type
    const elements = type.getTupleElements();
    if (elements.length === 0) {
      return {
        type: 'array',
        elementType: { type: 'unknown', typeName: 'never' },
      };
    }
    const elementTypes = elements.map((t) => typeToNode(t, checker, location));
    return {
      type: 'array',
      elementType:
        elementTypes.length === 1
          ? elementTypes[0]!
          : ({
              type: 'union',
              types: elementTypes,
            } satisfies UnionNode),
    };
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
    const props: ObjectNode['properties'] = [];

    for (const prop of properties) {
      // Skip private properties
      if (prop.getName().startsWith('#')) {
        continue;
      }

      const propType = prop.getTypeAtLocation(location!);
      const isOptional = prop.isOptional();

      props.push({
        name: prop.getName(),
        type: typeToNode(propType, checker, location),
        required: !isOptional,
      });
    }

    return {
      type: 'object',
      properties: props,
    };
  }

  // Handle primitive types
  const flags = type.getFlags();
  if (flags & ts.TypeFlags.String) {
    return { type: 'string' };
  }
  if (flags & ts.TypeFlags.Number) {
    return { type: 'number' };
  }
  if (flags & ts.TypeFlags.Boolean) {
    return { type: 'boolean' };
  }

  // Fallback: return unknown with type name
  const typeName = type.getText(location, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  return {
    type: 'unknown',
    typeName,
  };
}
