import type { Nodes, Root } from 'mdast';
import type { Processor, Transformer } from 'unified';
import { isJsxElement, walk } from './utils';

/** the element of `<show>` branches, defined in the module by {@link showDeclaration} */
export const showElement = '_Show';

/** the ESM code that defines {@link showElement}, for ports of `remarkShow()` to other compilers */
export const showDeclaration = `export function ${showElement}(props) { return props.when ? props.children : null }`;

/**
 * `<show when={...}>` renders its content when the condition holds, like `props.framework === 'next'` with the params of
 * a page as props. The outputs of other plugins (TOC, structured data, Markdown) check the conditions too.
 */
export function remarkShow(this: Processor): Transformer<Root, Root> {
  return (tree) => {
    let used = false;
    walk<Nodes>(tree, (node) => {
      if (!isJsxElement(node) || node.name !== 'show') return;
      node.name = showElement;
      used = true;
    });
    if (!used) return;
    // parsed for the estree of an ESM node, its positions aren't in the document
    const [declaration] = (this.parse(showDeclaration) as Root).children;
    delete declaration.position;
    tree.children.unshift(declaration);
  };
}
