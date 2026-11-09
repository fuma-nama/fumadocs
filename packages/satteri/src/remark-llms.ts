import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import type { PositionedNode } from './stringifier';
import { stringifyHeadingId } from './heading-id';
import { type Chunk, chunksToCode, createCodeOutput, type JsxElementNode } from './utils';

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
        let open = `<_c.${name}`;
        for (const attr of node.attributes) {
          if (attr.type === 'mdxJsxExpressionAttribute') open += ` {${attr.value}}`;
          else if (attr.value == null) open += ` ${attr.name}`;
          else if (typeof attr.value === 'string')
            open += ` ${attr.name}={${JSON.stringify(attr.value)}}`;
          else open += ` ${attr.name}={${attr.value.value}}`;
        }

        const inline = node.type === 'mdxJsxTextElement';
        let children = s.inner(node);
        // block content on its own lines
        if (children && !inline) children = `\n${children}\n`;
        return out.wrap({ open, name, inline }, children);
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
          value:
            jsx || out.dynamic
              ? toComponentCode(as, chunksToCode(chunks), hasElement(chunks))
              : `export const ${as} = ${toStringCode(chunks)};`,
        });
      },
    });
  };

  return factory;
}

function toComponentCode(as: string, body: string, hasJsx: boolean): string {
  return [
    `import { asMarkdown as _asMarkdown${hasJsx ? ', jsxComponents as _jsxComponents' : ''} } from "fumadocs-core/server";`,
    `export function ${as}(props) {`,
    '  if (!_asMarkdown()) return null;',
    ...(hasJsx ? ['  const _c = _jsxComponents(props.components);'] : []),
    `  return ${body};`,
    '}',
  ].join('\n');
}

function hasElement(chunks: Chunk[]): boolean {
  return chunks.some(
    (chunk) =>
      typeof chunk !== 'string' &&
      ('open' in chunk || ('children' in chunk && hasElement(chunk.children))),
  );
}

/** the chunks as one string, they have no elements or branches */
function toStringCode(chunks: Chunk[]): string {
  let out = '';
  for (const chunk of chunks) {
    if (out) out += ' + ';
    out +=
      typeof chunk === 'string' ? JSON.stringify(chunk) : `(${(chunk as { code: string }).code})`;
  }
  return out || '""';
}
