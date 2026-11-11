import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import type { PositionedNode } from './stringifier';

type Node = PositionedNode & { type: string };
import { stringifyHeadingId } from '../../shared/heading-id';
import { createCodeOutput, esmScope } from './utils';

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
}: LLMsOptions = {}): MdastPluginEntry {
  const factory = () => {
    let out: ReturnType<typeof createCodeOutput>;
    /** the code of the ESM nodes */
    const esm: string[] = [];

    const drop = (node: Node) => out.s.replace(node, '');
    const edit = (node: Node) => out.edit(node);

    return defineMdastPlugin({
      name: 'remark-llms',
      options: { position: true },
      before(_root, ctx) {
        out = createCodeOutput(ctx, {
          target: 'markdown',
          keep: output === 'function' ? () => true : undefined,
        });
      },
      mdxjsEsm(node) {
        edit(node);
        esm.push(node.value);
      },
      yaml: drop,
      toml: drop,
      heading(node, ctx) {
        stringifyHeadingId(out, node, headingIds && ctx.data._headingIds);
      },
      mdxTextExpression: edit,
      mdxFlowExpression: edit,
      mdxJsxFlowElement: edit,
      mdxJsxTextElement: edit,
      after(root, ctx) {
        const text = out.s.stringify(root).trim();
        const value = text ? `${text}\n` : '';

        ctx.data.markdown ??= out.toStatic(value);
        if (as)
          ctx.prependChild(root, {
            type: 'mdxjsEsm',
            value: out.markdownCode(as, value, esmScope(esm)),
          });
      },
    });
  };

  return factory;
}
