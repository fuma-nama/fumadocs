import type { PhrasingContent } from 'mdast';

export function separate(
  splitter: RegExp | string,
  nodes: PhrasingContent[],
): [title: PhrasingContent[], rest: PhrasingContent[]] | undefined {
  const title: PhrasingContent[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.type !== 'text' && 'children' in node) {
      const result = separate(/\r?\n/, node.children);

      if (result) {
        title.push({
          ...node,
          children: result[0],
        });

        const rest = nodes.slice(i + 1);
        rest.unshift({
          ...node,
          children: result[1],
        });

        return [title, rest];
      }
    }

    if (node.type !== 'text') {
      title.push(node);
      continue;
    }

    if (node.type === 'text') {
      const [before, after] = node.value.split(splitter, 2);

      if (!after) {
        title.push(node);
        continue;
      }

      title.push({
        type: 'text',
        value: before,
      });

      const rest = nodes.slice(i + 1);
      if (after.length > 0) rest.push({ type: 'text', value: after });

      return [title, rest];
    }
  }
}
