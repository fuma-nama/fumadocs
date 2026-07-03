import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx';
import type { VFile } from 'vfile';
import {
  createAutoTypeTableGenerator,
  type RemarkAutoTypeTableOptions,
  type TypeTableProps,
} from '@/lib/auto-type-table-generate';

export type { RemarkAutoTypeTableOptions, TypeTableProps } from '@/lib/auto-type-table-generate';

/**
 * Compile `auto-type-table` into Fumadocs UI compatible TypeTable
 *
 * MDX is required to use this plugin.
 */
export function remarkAutoTypeTable(
  config: RemarkAutoTypeTableOptions = {},
): Transformer<Root, Root> {
  const { name, generateTables } = createAutoTypeTableGenerator(config);

  return async (tree, file) => {
    const queue: Promise<void>[] = [];

    visit(tree, 'mdxJsxFlowElement', (node) => {
      if (node.name !== name) return;

      const onError = (message: string, cause?: Error) => {
        const location = node.position
          ? `${file.path}:${node.position.start.line}:${node.position.start.column}`
          : file.path;
        throw new Error(`${location} from <auto-type-table>: ${message}`, {
          cause,
        });
      };

      const props: TypeTableProps = {};
      const attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[] = [];

      for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute') {
          attributes.push(attr);
          continue;
        }

        switch (attr.name) {
          case 'cwd':
            props.cwd = true;
            break;
          case 'path':
          case 'name':
          case 'type':
            if (typeof attr.value === 'string') {
              props[attr.name] = attr.value;
            } else {
              onError(
                `invalid type for attribute ${attr.name}: ${typeof attr.value}, expected: string`,
              );
            }
            break;
          default:
            attributes.push(attr);
        }
      }

      queue.push(
        generateTables(file.path, props, attributes, file.cwd)
          .then((children) => {
            Object.assign(node, {
              type: 'root',
              children,
            } satisfies Root);
          })
          .catch((err) => {
            onError('failed to generate type table', err);
          }),
      );
      return 'skip';
    });

    await Promise.all(queue);
  };
}
