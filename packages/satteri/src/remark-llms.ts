import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import { offsets, type PositionedNode } from './stringifier';
import type { Analysis } from 'fumadocs-core/mdx-plugins/stringifier';
import { stringifyHeadingId } from '../../shared/heading-id';
import { createCodeOutput, type JsxElementNode } from './utils';
import { keptElement } from '../../shared/code-output';

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

  /** see `analysis` of `remarkLLMs()` from `fumadocs-core/mdx-plugins/remark-llms` */
  analysis?: Analysis;
  /** @deprecated use `analysis`: `string` is `static`, `function` is `runtime` */
  output?: 'string' | 'function';
}

/**
 * Export the document as Markdown, sliced from the authored source: heading IDs are added,
 * frontmatter & ESM nodes are dropped, and includes are replaced with their content.
 */
export function remarkLlms({
  as = '_markdown',
  headingIds = true,
  output,
  analysis = output && (output === 'string' ? 'static' : 'runtime'),
}: LLMsOptions = {}): MdastPluginEntry {
  const factory = () => {
    let out: ReturnType<typeof createCodeOutput>;
    let isStatic = false;

    const drop = (node: PositionedNode) => out.s.replace(node, '');
    const element = (node: JsxElementNode & { type: string; children: PositionedNode[] }) => {
      // elements are kept in runtime output only
      if (out.markCode(node) || isStatic) return;
      const kept = keptElement(node);
      if (!kept) return;

      out.s.replace(node, (s) => {
        let children = s.inner(node);
        // block content on its own lines
        if (children && node.type === 'mdxJsxFlowElement') children = `\n${children}\n`;
        return out.wrap(kept, children);
      });
    };
    const expression = (node: PositionedNode & { type: string; value: string }) => {
      out.markCode(node);
    };

    return defineMdastPlugin({
      name: 'remark-llms',
      options: { position: true },
      before(_root, ctx) {
        isStatic = (analysis ?? ctx.data._analysis) === 'static';
        out = createCodeOutput(ctx, undefined, isStatic);
      },
      mdxjsEsm: drop,
      yaml: drop,
      toml: drop,
      heading: (node) =>
        stringifyHeadingId(out.s, node, headingIds, offsets, isStatic ? undefined : out.expression),
      mdxTextExpression: expression,
      mdxFlowExpression: expression,
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      after(root, ctx) {
        const text = out.s.stringify(root).trim();
        const value = text ? `${text}\n` : '';

        if (isStatic) ctx.data.markdown ??= out.toStatic(value);
        if (as) ctx.prependChild(root, { type: 'mdxjsEsm', value: out.markdownCode(as, value) });
      },
    });
  };

  return factory;
}
