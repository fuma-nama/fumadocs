import type { Transformer } from 'unified';
import type { Nodes, Root } from 'mdast';
import { walk } from './utils';
import { groupSteps } from '../../../shared/steps';
import { replaceSource } from './stringifier';

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

/**
 * Convert headings in the format of `1. Hello World` into steps.
 */
export function remarkSteps({
  steps = 'fd-steps',
  step = 'fd-step',
}: RemarkStepsOptions = {}): Transformer<Root, Root> {
  return (tree, file) => {
    walk<Nodes>(tree, (parent) => {
      if (!('children' in parent) || parent.type === 'heading') return 'skip';

      const children = groupSteps<Nodes>(parent.children, {
        steps,
        step,
        set(node, key, value) {
          (node as unknown as Record<string, unknown>)[key] = value;
        },
        searchSource: (node, text) =>
          replaceSource(file, node, (s) => text(s.stringify(node)), 'search'),
      });
      if (children) parent.children = children as typeof parent.children;
    });
  };
}
