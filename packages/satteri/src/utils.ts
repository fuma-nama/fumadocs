import type { MdastNode } from 'satteri';

export function flattenNode(node: MdastNode): string {
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => flattenNode(child)).join('');
  }

  if ('value' in node && typeof node.value === 'string') return node.value;

  return '';
}

export function handleTag(value: string, tag: string): string | false {
  const idx = value.indexOf(tag);
  if (idx !== -1) {
    return value.slice(0, idx).trimEnd() + value.slice(idx + tag.length);
  }

  return false;
}

export function replaceChildAt(
  children: readonly MdastNode[],
  index: number,
  node: MdastNode,
): MdastNode[] {
  const next = [...children];
  next[index] = node;
  return next;
}
