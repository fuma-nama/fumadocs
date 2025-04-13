import type { Transformer } from 'unified';
import type { BlockContent, Heading, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

export interface RemarkStepsOptions {
  /**
   * Class name for steps container
   *
   * @defaultValue fd-steps
   */
  steps?: string;

  /**
   * Class name for step container
   *
   * @defaultValue fd-step
   */
  step?: string;
}

const StepRegex = /^(\d+)\.\s(.+)$/;

/**
 * Convert headings in the format of `1. Hello World` into steps.
 */
export function remarkSteps({
  steps = 'fd-steps',
  step = 'fd-step',
}: RemarkStepsOptions = {}): Transformer<Root, Root> {
  function convertToSteps(nodes: RootContent[]): MdxJsxFlowElement {
    const depth = (nodes[0] as Heading).depth;
    const children: MdxJsxFlowElement[] = [];

    for (const node of nodes) {
      if (node.type === 'heading' && node.depth === depth) {
        children.push({
          type: 'mdxJsxFlowElement',
          name: 'div',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'className',
              value: step,
            },
          ],
          children: [node],
        });
      } else {
        children[children.length - 1].children.push(node as BlockContent);
      }
    }

    return {
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: steps,
        },
      ],
      data: {
        _fd_step: true,
      } as object,
      children,
    };
  }

  return (tree) => {
    visit(tree, (parent) => {
      if (!('children' in parent) || parent.type === 'heading') return;
      if (parent.data && '_fd_step' in parent.data) return 'skip';

      let startIdx = -1;
      let lastNumber = 0;
      let i = 0;

      const onEnd = () => {
        if (startIdx === -1) return;
        // range: start index to i - 1
        const item = {};
        const nodes = parent.children.splice(
          startIdx,
          i - startIdx,
          item as RootContent,
        );
        Object.assign(item, convertToSteps(nodes));
        i = startIdx + 1;
        startIdx = -1;
      };

      for (; i < parent.children.length; i++) {
        const node = parent.children[i];

        if (node.type !== 'heading') continue;
        if (startIdx !== -1) {
          const startDepth = (parent.children[startIdx] as Heading).depth;

          if (node.depth > startDepth) continue;
          else if (node.depth < startDepth) onEnd();
        }

        const head = node.children.filter((c) => c.type === 'text').at(0);
        if (!head) {
          onEnd();
          continue;
        }

        const match = StepRegex.exec(head.value);
        if (!match) {
          onEnd();
          continue;
        }

        const num = Number(match[1]);
        head.value = match[2];

        if (startIdx !== -1 && num !== lastNumber + 1) onEnd();
        if (startIdx === -1) startIdx = i;
        lastNumber = num;
      }

      onEnd();
    });
  };
}
