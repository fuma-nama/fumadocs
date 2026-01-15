import type { TypeNode } from '../lib/types';

export enum FormatFlags {
  None = 0,
  UseAlias = 1 << 0,
}

export function typeToString(node: TypeNode, flags: FormatFlags = FormatFlags.None): string {
  switch (node.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    case 'array':
      return `Array<${typeToString(node.elementType, flags)}>`;
    case 'object':
      return 'object';
    case 'enum':
      return 'enum';
    case 'literal':
      if (typeof node.value === 'string') {
        return `"${node.value}"`;
      }
      return String(node.value);
    case 'union':
      return node.types.map((t) => typeToString(t, flags)).join(' | ');
    case 'intersection':
      return node.types.map((t) => typeToString(t, flags)).join(' & ');
    case 'unknown':
      return node.typeName;
  }
}
