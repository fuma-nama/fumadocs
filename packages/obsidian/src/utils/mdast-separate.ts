import type { RootContent } from 'mdast';

export function separate(
  splitter: RegExp | string,
  nodes: RootContent[],
): [before: RootContent[], after: RootContent[]] | undefined {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.type !== 'text' && 'children' in node) {
      const result = separate(splitter, node.children);
      if (!result) continue;

      const before = nodes.slice(0, i);
      before.push({
        ...node,
        children: result[0],
      } as RootContent);

      const after = nodes.slice(i + 1);
      after.unshift({
        ...node,
        children: result[1],
      } as RootContent);

      return [before, after];
    }

    if (node.type === 'text') {
      const [left, right] = node.value.split(splitter, 2);
      if (right === undefined) continue;

      const before = nodes.slice(0, i);
      before.push({
        type: 'text',
        value: left,
      });

      const after = nodes.slice(i + 1);
      if (right.length > 0) after.unshift({ type: 'text', value: right });

      return [before, after];
    }
  }
}
