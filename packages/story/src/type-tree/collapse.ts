import type { ObjectNode, TypeNode, UnionNode } from './types';
import { validate } from './validator';

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

  if (node.type === 'intersection') return collapse(node.intersection, value);

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
