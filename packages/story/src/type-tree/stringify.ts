import type { TypeNode } from './types';

export enum FormatFlags {
  None = 0,
  UseAlias = 1 << 0,
}

export function typeToString(node: TypeNode, flags: FormatFlags = FormatFlags.None): string {
  if (node.displayName) return node.displayName;

  switch (node.type) {
    case 'array':
      return `Array<${typeToString(node.elementType, flags)}>`;
    case 'literal':
      if (typeof node.value === 'string') {
        return `"${node.value}"`;
      }
      return String(node.value);
    case 'union':
      return node.types.map((t) => typeToString(t, flags)).join(' | ');
    case 'intersection':
      return node.members.map((t) => typeToString(t, flags)).join(' & ');
    default:
      return node.type;
  }
}
