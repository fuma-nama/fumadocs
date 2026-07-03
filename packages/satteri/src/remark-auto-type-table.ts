import { defineMdastPlugin } from 'satteri';
import { fileURLToPath } from 'node:url';
import {
  createAutoTypeTableGenerator,
  parseAutoTypeTableProps,
  type RemarkAutoTypeTableOptions,
} from 'fumadocs-typescript';

export type { RemarkAutoTypeTableOptions } from 'fumadocs-typescript';

export function remarkAutoTypeTable(config: RemarkAutoTypeTableOptions = {}) {
  const { name, generateTables } = createAutoTypeTableGenerator(config);

  return defineMdastPlugin({
    name: 'remark-auto-type-table',
    async mdxJsxFlowElement(node, ctx) {
      if (node.name !== name) return;

      const { props, attributes } = parseAutoTypeTableProps(node);
      const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : undefined;
      const parent = ctx.parent(node);
      const index = ctx.indexOf(node);
      if (!parent || index === undefined) return;

      const children = await generateTables(filePath, props, attributes, ctx.data._cwd);
      if (children.length === 0) {
        ctx.removeNode(node);
      } else if (children.length === 1) {
        ctx.replaceNode(node, children[0]!);
      } else {
        ctx.replaceNode(node, children[0]!);
        ctx.insertChildAt(parent, index + 1, children.slice(1));
      }
    },
  });
}
