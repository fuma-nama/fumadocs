import type { TypeNode } from './types';

export function validate(node: TypeNode, value: unknown): boolean {
  switch (node.type) {
    case 'array':
      return Array.isArray(value) && value.every((item) => validate(node.elementType, item));
    case 'enum':
      return node.members.some((member) => member.value === value);
    case 'intersection':
      return validate(node.intersection, value);
    case 'union':
      return node.types.some((t) => validate(t, value));
    case 'null':
      return value === 'null';
    case 'literal':
      return node.value === value;
    case 'unknown':
    case 'never':
      return true;
    case 'date':
      return value instanceof Date;
    case 'object':
      return (
        typeof value === 'object' &&
        value !== null &&
        node.properties.every((prop) => {
          const propValue = value[prop.name as never];
          return (!prop.required && propValue === undefined) || validate(prop.type, propValue);
        })
      );
    default:
      return typeof value === node.type;
  }
}
