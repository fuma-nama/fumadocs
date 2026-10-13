import type { TypeNode } from '../type-tree/types';

export function getDefaultValue(node: TypeNode): unknown {
  switch (node.type) {
    case 'object': {
      // optional properties are left to the defaults of components
      const out: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.required) out[prop.name] = getDefaultValue(prop.type);
      }
      return out;
    }
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
    case 'date':
      return new Date(Date.now());
    case 'unknown':
      return undefined;
  }
}
