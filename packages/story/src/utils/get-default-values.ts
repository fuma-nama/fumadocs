import type { TypeNode } from '../types';

export function getDefaultValue(node: TypeNode): unknown {
  switch (node.type) {
    case 'object':
      return Object.fromEntries(
        node.properties.map((prop) => [prop.name, getDefaultValue(prop.type)]),
      );
    case 'array':
      return [];
    case 'null':
      return null;
    case 'undefined':
      return undefined;
    case 'string':
      return '';
    case 'bigint':
      return 0n;
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'enum':
      // Return first enum value as default
      return node.members[0]?.value ?? '';
    case 'literal':
      return node.value;
    case 'union':
      // Return default value of first union type
      return node.types.length > 0 ? getDefaultValue(node.types[0]!) : undefined;
    case 'intersection': {
      return getDefaultValue(node.intersection);
    }
    case 'unknown':
      return undefined;
  }
}
