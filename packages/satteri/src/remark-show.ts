import type {
  MdastNode,
  MdastPluginDefinition,
  MdastVisitorContext,
  MdxJsxFlowElement,
  MdxJsxTextElement,
  PluginFactoryContext,
} from 'satteri';
import { showDeclaration, showElement } from '../../shared/code-output';

type Element = MdxJsxFlowElement | MdxJsxTextElement;

/** Sätteri port of `remarkShow()` from `fumadocs-core/mdx-plugins/remark-show` */
export function remarkShow(): (
  document: PluginFactoryContext,
) => MdastPluginDefinition | undefined {
  return (document) => {
    // a page without branches, in itself or the files it includes, skips the plugin
    const { source } = document;
    if (!source.includes('<show') && !source.includes('<include')) return;
    let used = false;
    function element(node: Readonly<Element>, ctx: MdastVisitorContext) {
      if (node.name !== 'show') return;
      used = true;
      ctx.setProperty<Element, 'name'>(node, 'name', showElement);
    }

    return {
      name: 'remark-show',
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      after(root, ctx) {
        if (used) ctx.prependChild(root, { type: 'mdxjsEsm', value: showDeclaration } as MdastNode);
      },
    } as MdastPluginDefinition;
  };
}
