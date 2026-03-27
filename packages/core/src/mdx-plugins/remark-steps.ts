import type { Transformer } from 'unified';
import type { BlockContent, Heading, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { handleTag } from './utils';

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
const StepTag = '[step]';

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
      children,
    };
  }

  function handleHeadingStep(node: Heading): boolean {
    const head = node.children[0];
    if (head && head.type === 'text') {
      const match = StepRegex.exec(head.value);
      if (match) {
        head.value = match[2];
        return true;
      }
    }

    const tail = node.children[node.children.length - 1];
    if (tail && tail.type === 'text') {
      const step = handleTag(tail.value, StepTag);
      if (step !== false) {
        tail.value = step;
        return true;
      }
    }

    return false;
  }

  return (tree) => {
    visit(tree, (parent) => {
      if (!('children' in parent) || parent.type === 'heading') return 'skip';

      let startIdx = -1;
      let i = 0;
      let currentStep = 1;

      const onEnd = () => {
        if (startIdx === -1) return;
        const item = {};
        const nodes = parent.children.splice(startIdx, i - startIdx, item as RootContent);
        Object.assign(item, convertToSteps(nodes));
        i = startIdx + 1;
        startIdx = -1;
        currentStep = 1;
      };

      for (; i < parent.children.length; i++) {
        const node = parent.children[i];

        if (node.type !== 'heading' || node.data?.hProperties?.['data-fd-step'] !== undefined)
          continue;
        if (startIdx !== -1) {
          const startDepth = (parent.children[startIdx] as Heading).depth;

          if (node.depth !== startDepth) {
            if (node.depth < startDepth) onEnd();
            continue;
          }
        }

        if (!handleHeadingStep(node)) {
          onEnd();
          continue;
        }

        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties['data-fd-step'] = currentStep++;
        if (startIdx === -1) startIdx = i;
      }

      onEnd();
    });
  };
}
