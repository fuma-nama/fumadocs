import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import type { PositionedNode } from './stringifier';
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

  /**
   * Form of the export:
   *
   * - `string`: the output Markdown.
   * - `function`: a component: Markdown content is kept as authored source, while JSX elements
   *   stay as JSX, receiving their original props and resolving from `props.components`.
   *   Render it with `renderToMarkdown` from `fumadocs-core/server`, where a component
   *   can call `asMarkdown()` to define its own Markdown form.
   *
   * @default string
   */
  output?: 'function' | 'string';
}

const componentNameRegex = /^[A-Z][\w$]*$/;

/**
 * Export the document as Markdown, sliced from the authored source: heading IDs are added,
 * frontmatter & ESM nodes are dropped, and includes are replaced with their content.
 *
 * Authored expressions and the branches of `<show>` checked when rendering are rendered from code, the export is then
 * a component of the props in both forms.
 */
export function remarkLlms({
  as = '_markdown',
  headingIds = true,
  output = 'string',
}: LLMsOptions = {}): MdastPluginEntry {
  const jsx = output === 'function';
  const factory = () => {
    let out: ReturnType<typeof createCodeOutput>;

    const drop = (node: PositionedNode) => out.s.replace(node, '');
    const element = (node: JsxElementNode & { type: string; children: PositionedNode[] }) => {
      const name = node.name;
      // elements are kept in function output only
      if (out.markCode(node) || !jsx || !name || !componentNameRegex.test(name)) return;

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
        out = createCodeOutput(ctx);
      },
      mdxjsEsm: drop,
      yaml: drop,
      toml: drop,
      heading: (node) => stringifyHeadingId(out.s, node, headingIds),
      mdxTextExpression: expression,
      mdxFlowExpression: expression,
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      after(root, ctx) {
        const text = out.s.stringify(root).trim();
        const value = text ? `${text}\n` : '';
        const chunks = out.chunks(value);

        // `data.markdown` uses the fallbacks of expressions, with every branch
        if (!jsx) ctx.data.markdown ??= out.toStatic(value);
        if (!as) return;
        ctx.prependChild(root, {
          type: 'mdxjsEsm',
          value: markdownCode(as, chunks, jsx || out.dynamic),
        });
      },
    });
  };

  return factory;
}
