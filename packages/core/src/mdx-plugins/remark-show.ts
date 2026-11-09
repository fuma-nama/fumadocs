import type { Nodes, Root } from 'mdast';
import type { Transformer } from 'unified';
import { showDeclaration, showElement } from '../../../shared/code-output';
import { isJsxElement, toEsm, walk } from './utils';

/**
 * `<show when={...}>` renders its content when the condition holds, like `props.framework === 'next'` with the params of
 * a page as props. The outputs of other plugins (TOC, structured data, Markdown) check the conditions too.
 */
export function remarkShow(): Transformer<Root, Root> {
  return (tree) => {
    let used = false;
    walk<Nodes>(tree, (node) => {
      if (!isJsxElement(node) || node.name !== 'show') return;
      node.name = showElement;
      used = true;
    });
    if (used) tree.children.unshift(toEsm(showDeclaration));
  };
}
