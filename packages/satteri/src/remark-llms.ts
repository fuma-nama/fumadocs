import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import { offsets, type PositionedNode } from './stringifier';
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

    const drop = (node: PositionedNode) => out.s.replace(node, '');
    const edit = (node: PositionedNode & { type: string }) => out.edit(node);

    return defineMdastPlugin({
      name: 'remark-llms',
      options: { position: true },
      before(_root, ctx) {
        out = createCodeOutput(ctx, {
          target: 'markdown',
          runtime: ctx.data.unstable_runtimeOutputs === true,
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
        const id = (node.data as { hProperties?: { id?: string } } | undefined)?.hProperties?.id;
        const code = id !== undefined && ctx.data._headingIds?.[id];
        stringifyHeadingId(
          out.s,
          node,
          offsets,
          headingIds && (code ? out.expression(code, id!) : id),
        );
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
            value: out.markdownCode(as, value, esmScope(esm), output === 'function'),
          });
      },
    });
  };

  return factory;
}
