import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import type { PositionedNode } from './stringifier';
import type { OutputMode } from 'fumadocs-core/mdx-plugins/stringifier';
import { stringifyHeadingId } from './heading-id';
import { createCodeOutput, type JsxElementNode } from './utils';
import { keptElement, markdownCode } from '../../shared/code-output';

export interface LLMsOptions {
  /**
   * export name for output Markdown.
   *
   * @default _markdown
   */
  as?: string;

  /**
   * Explicit heading IDs in output.
   *
   * @default true
   */
  headingIds?: boolean;

  /** see `output` of `remarkLLMs()` from `fumadocs-core/mdx-plugins/remark-llms` */
  output?: OutputMode | 'string' | 'function';
}

const componentNameRegex = /^[A-Z][\w$]*$/;

/**
 * Export the document as Markdown, sliced from the authored source: heading IDs are added,
 * frontmatter & ESM nodes are dropped, and includes are replaced with their content.
 */
export function remarkLlms({
  as = '_markdown',
  headingIds = true,
  output,
}: LLMsOptions = {}): MdastPluginEntry {
  const isStatic = output === 'static' || output === 'string';
  const factory = () => {
    let out: ReturnType<typeof createCodeOutput>;

    const drop = (node: PositionedNode) => out.s.replace(node, '');
    const element = (node: JsxElementNode & { type: string; children: PositionedNode[] }) => {
      const name = node.name;
      // elements are kept in function output only
      if (out.markCode(node) || isStatic || !name || !componentNameRegex.test(name)) return;

      out.s.replace(node, (s) => {
        let children = s.inner(node);
        // block content on its own lines
        if (children && node.type === 'mdxJsxFlowElement') children = `\n${children}\n`;
        return out.wrap(keptElement(node, name), children);
      });
    };
    const expression = (node: PositionedNode & { type: string; value: string }) => {
      out.markCode(node);
    };

    return defineMdastPlugin({
      name: 'remark-llms',
      options: { position: true },
      before(_root, ctx) {
        out = createCodeOutput(ctx, undefined, isStatic);
      },
      mdxjsEsm: drop,
      yaml: drop,
      toml: drop,
      heading: (node) => stringifyHeadingId(out.s, node, headingIds, isStatic),
      mdxTextExpression: expression,
      mdxFlowExpression: expression,
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      after(root, ctx) {
        const text = out.s.stringify(root).trim();
        const value = text ? `${text}\n` : '';
        const chunks = out.chunks(value);

        if (isStatic) ctx.data.markdown ??= out.toStatic(value);
        if (as)
          ctx.prependChild(root, { type: 'mdxjsEsm', value: markdownCode(as, chunks, isStatic) });
      },
    });
  };

  return factory;
}
