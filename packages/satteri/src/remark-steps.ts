import { defineMdastPlugin } from 'satteri';
import type { MdastNode } from 'satteri';
import { groupSteps, readStep } from '../../shared/steps';
import { listParent } from '../../shared/show';
import { replaceSource } from './stringifier';

export interface RemarkStepsOptions {
  steps?: string;
  step?: string;
}

type Parent = Extract<MdastNode, { children: MdastNode[] }>;

export function remarkSteps({ steps = 'fd-steps', step = 'fd-step' }: RemarkStepsOptions = {}) {
  // the `heading` visitor only collects parents (the Set dedupes sibling
  // visits by identity), and the `after` hook processes each one exactly once
  return () => {
    const parents = new Set<Parent>();

    return defineMdastPlugin({
      name: 'remark-steps',
      heading(node, ctx) {
        // only the parents of steps: reading the children of a parent has a cost
        if (!readStep<MdastNode>(node)) return;
        const parent = listParent<MdastNode>(node, ctx);
        if (parent && 'children' in parent) parents.add(parent);
      },
      after(_root, ctx) {
        for (const parent of parents) {
          const children = groupSteps<MdastNode>(parent.children, {
            steps,
            step,
            set: (node, key, value) => ctx.setProperty(node, key as never, value as never),
            searchSource: (node, text) =>
              replaceSource(ctx, node, (s) => text(s.stringify(node)), 'search'),
          });
          if (children) ctx.setProperty(parent, 'children', children as never);
        }
      },
    });
  };
}
