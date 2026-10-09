import { defineMdastPlugin } from 'satteri';
import type { Heading } from 'mdast';
import type { MdastNode, MdastVisitorContext } from 'satteri';
import { handleTag } from '@/utils';
import { replaceSource } from './stringifier';

export interface RemarkStepsOptions {
  steps?: string;
  step?: string;
}

const StepRegex = /^(\d+)\.\s(.+)$/;
const StepTag = '[step]';

function removeTag(text: string): string {
  const stripped = handleTag(text, StepTag);
  return stripped === false ? text : stripped;
}

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

  // Strips the step prefix/tag from a heading in place, so it keeps its position.
  // Returns `false` when the heading is not a step
  function handleHeadingStep(node: Heading, ctx: MdastVisitorContext): boolean {
    const head = node.children[0];
    if (head?.type === 'text') {
      const match = StepRegex.exec(head.value);
      if (match) {
        ctx.setProperty(head, 'value', match[2]!);
        return true;
      }
    }

    const tail = node.children[node.children.length - 1];
    if (tail?.type === 'text') {
      const stepValue = handleTag(tail.value, StepTag);
      if (stepValue !== false) {
        ctx.setProperty(tail, 'value', stepValue);
        // the Markdown keeps the tag, search records don't
        replaceSource(ctx, tail, (s) => removeTag(s.stringify(tail)), 'search');
        return true;
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

      if (!handleHeadingStep(node, ctx)) {
        onEnd();
        continue;
      }

      ctx.setProperty(node, 'data', {
        ...data,
        hProperties: { ...data.hProperties, 'data-fd-step': currentStep++ },
      });
      if (startIdx === -1) startIdx = i;
    }

    onEnd();
    if (changed) ctx.setProperty(parent, 'children', output);
  }

  // the `heading` visitor only collects parents (the Set dedupes sibling
  // visits by identity), and the `after` hook processes each one exactly once
  return () => {
    const parents = new Set<Extract<MdastNode, { children: MdastNode[] }>>();

    return defineMdastPlugin({
      name: 'remark-steps',
      heading(node, ctx) {
        const parent = ctx.parent(node) as MdastNode | undefined;
        if (parent && 'children' in parent) {
          parents.add(parent as Extract<MdastNode, { children: MdastNode[] }>);
        }
      },
      after(_root, ctx) {
        for (const parent of parents) processChildren(parent, ctx);
      },
    });
  };
}
