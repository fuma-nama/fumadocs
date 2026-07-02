import { defineMdastPlugin } from 'satteri';

export function remarkElementIds() {
  return defineMdastPlugin({
    name: 'remark-element-ids',
    mdxJsxFlowElement(node, ctx) {
      if (!node.name || !node.attributes) return;

      const idAttr = node.attributes.find(
        (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'id',
      );
      if (!idAttr || typeof idAttr.value !== 'string') return;

      const ids = (ctx.data.elementIds ??= []) as string[];
      ids.push(idAttr.value);
    },
  });
}
