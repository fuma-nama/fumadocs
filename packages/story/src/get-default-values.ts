import type { TypeNode } from './lib/types';

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
      // For intersection, merge object properties if all are objects
      const objects = node.types.filter((t) => t.type === 'object') as Array<
        Extract<TypeNode, { type: 'object' }>
      >;
      if (objects.length > 0) {
        const merged: Record<string, unknown> = {};
        for (const obj of objects) {
          for (const prop of obj.properties) {
            merged[prop.name] = getDefaultValue(prop.type);
          }
        }
        return merged;
      }
      // Otherwise return default of first type
      return node.types.length > 0 ? getDefaultValue(node.types[0]!) : undefined;
    }
    case 'unknown':
      return undefined;
  }
}
