import { defineMdastPlugin } from 'satteri';
import type { Heading } from 'mdast';
import type { MdastNode, MdastVisitorContext } from 'satteri';
import { handleTag } from '@/utils';

export interface RemarkStepsOptions {
  steps?: string;
  step?: string;
}

const StepRegex = /^(\d+)\.\s(.+)$/;
const StepTag = '[step]';

export function remarkSteps({ steps = 'fd-steps', step = 'fd-step' }: RemarkStepsOptions = {}) {
  function convertToSteps(nodes: MdastNode[]) {
    const depth = (nodes[0] as Heading).depth;
    const children: MdastNode[] = [];

    for (const node of nodes) {
      if (node.type === 'heading' && node.depth === depth) {
        children.push({
          type: 'mdxJsxFlowElement',
          name: 'div',
          attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: step }],
          children: [node],
        });
      } else {
        (children[children.length - 1] as { children: MdastNode[] }).children.push(node);
      }
    }

    return {
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: steps }],
      children,
    } as MdastNode;
  }

  function handleHeadingStep(node: Heading): boolean {
    const head = node.children[0];
    if (head?.type === 'text') {
      const match = StepRegex.exec(head.value);
      if (match) {
        head.value = match[2]!;
        return true;
      }
    }

    const tail = node.children[node.children.length - 1];
    if (tail?.type === 'text') {
      const stepValue = handleTag(tail.value, StepTag);
      if (stepValue !== false) {
        tail.value = stepValue;
        return true;
      }
    }

    return false;
  }

  function processChildren(
    children: MdastNode[],
    ctx: MdastVisitorContext,
    parent: MdastNode,
  ) {
    let startIdx = -1;
    let i = 0;
    let currentStep = 1;

    const onEnd = () => {
      if (startIdx === -1) return;
      const nodes = children.splice(startIdx, i - startIdx);
      children.splice(startIdx, 0, convertToSteps(nodes));
      i = startIdx + 1;
      startIdx = -1;
      currentStep = 1;
    };

    for (; i < children.length; i++) {
      const node = children[i]!;
      if (node.type !== 'heading') continue;

      const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
      if (data.hProperties?.['data-fd-step'] !== undefined) continue;

      if (startIdx !== -1) {
        const startDepth = (children[startIdx] as Heading).depth;
        if (node.depth !== startDepth) {
          if (node.depth < startDepth) onEnd();
          continue;
        }
      }

      if (!handleHeadingStep(node)) {
        onEnd();
        continue;
      }

      data.hProperties ??= {};
      data.hProperties['data-fd-step'] = currentStep++;
      ctx.setProperty(node, 'data', data);
      if (startIdx === -1) startIdx = i;
    }

    onEnd();
    ctx.setProperty(parent, 'children', children);
  }

  function visitContainer(node: MdastNode, ctx: MdastVisitorContext) {
    if (!('children' in node)) return;
    processChildren([...node.children] as MdastNode[], ctx, node);
  }

  return defineMdastPlugin({
    name: 'remark-steps',
    blockquote: visitContainer,
    list: visitContainer,
    mdxJsxFlowElement: visitContainer,
  });
}
