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
  function convertToSteps(nodes: MdastNode[]): MdastNode {
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

  // Returns a new heading node with the step prefix/tag stripped, or `false`
  // when the heading is not a step
  function handleHeadingStep(node: Heading): Heading | false {
    const head = node.children[0];
    if (head?.type === 'text') {
      const match = StepRegex.exec(head.value);
      if (match) {
        const newChildren = [...node.children];
        newChildren[0] = { ...head, value: match[2]! };
        return { ...node, children: newChildren };
      }
    }

    const tail = node.children[node.children.length - 1];
    if (tail?.type === 'text') {
      const stepValue = handleTag(tail.value, StepTag);
      if (stepValue !== false) {
        const newChildren = [...node.children];
        newChildren[newChildren.length - 1] = { ...tail, value: stepValue };
        return { ...node, children: newChildren };
      }
    }

    return false;
  }

  function processChildren(
    parent: Extract<MdastNode, { children: MdastNode[] }>,
    ctx: MdastVisitorContext,
  ) {
    const output: MdastNode[] = [...parent.children];
    let startIdx = -1;
    let i = 0;
    let currentStep = 1;
    let changed = false;

    const onEnd = () => {
      if (startIdx === -1) return;
      const nodes = output.splice(startIdx, i - startIdx);
      output.splice(startIdx, 0, convertToSteps(nodes));
      changed = true;
      i = startIdx + 1;
      startIdx = -1;
      currentStep = 1;
    };

    for (; i < output.length; i++) {
      const node = output[i]!;
      if (node.type !== 'heading') continue;

      const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
      if (data.hProperties?.['data-fd-step'] !== undefined) continue;

      if (startIdx !== -1) {
        const startDepth = (output[startIdx] as Heading).depth;
        if (node.depth !== startDepth) {
          if (node.depth < startDepth) onEnd();
          continue;
        }
      }

      const stepped = handleHeadingStep(node);
      if (!stepped) {
        onEnd();
        continue;
      }

      const steppedData = (stepped.data ?? {}) as { hProperties?: Record<string, unknown> };
      output[i] = {
        ...stepped,
        data: {
          ...steppedData,
          hProperties: {
            ...steppedData.hProperties,
            'data-fd-step': currentStep++,
          },
        },
      } as MdastNode;
      if (startIdx === -1) startIdx = i;
    }

    onEnd();
    if (changed) ctx.setProperty(parent, 'children', output);
  }

  // Satteri has no `root` visitor and materializes nodes per-visit, so we can't
  // walk containers directly. Instead visit every heading, resolve its parent
  // (root, a list item, a `<div>`, a blockquote…), and process that parent's
  // children once — parent identity is stable within a pass, so a WeakSet
  // dedupes sibling-heading visits.
  return () => {
    const processed = new WeakSet<object>();

    return defineMdastPlugin({
      name: 'remark-steps',
      heading(node, ctx) {
        const parent = ctx.parent(node) as MdastNode | undefined;
        if (!parent || !('children' in parent)) return;
        if (processed.has(parent)) return;
        processed.add(parent);
        processChildren(parent, ctx);
      },
    });
  };
}
