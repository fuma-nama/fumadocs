import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import { createStringifier, type PositionedNode, type Stringifier } from './stringifier';
import { stringifyHeadingId } from './heading-id';
import type { JsxElementNode } from './utils';

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

/** a JSX element kept in function output */
interface KeptElement {
  /** the opening tag without its end, with the name prefixed */
  open: string;
  name: string;
  inline: boolean;
  /** Markdown with the markers of kept elements */
  children: string;
}

/** kept JSX elements & expressions, by their markers */
type Kept = KeptElement | { code: string; fallback: string };

const componentNameRegex = /^[A-Z][\w$]*$/;
const markerRegex = /\0(\d+)\0/g;

/**
 * Export the document as Markdown, sliced from the authored source: heading IDs are added,
 * frontmatter & ESM nodes are dropped, and includes are replaced with their content.
 */
export function remarkLlms({
  as = '_markdown',
  headingIds = true,
  output = 'string',
}: LLMsOptions = {}): MdastPluginEntry {
  const jsx = output === 'function';
  const factory = () => {
    const kept: Kept[] = [];
    let s: Stringifier;

    const drop = (node: PositionedNode) => s.replace(node, '');
    const keep = (node: JsxElementNode & { type: string; children: PositionedNode[] }) => {
      const name = node.name;
      if (!name || !componentNameRegex.test(name)) return;

      s.replace(node, (s) => {
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
        return `\0${kept.push({ open, name, inline, children }) - 1}\0`;
      });
    };

    return defineMdastPlugin({
      name: 'remark-llms',
      options: { position: true },
      before(_root, ctx) {
        s = createStringifier(
          ctx,
          undefined,
          (code, fallback) => `\0${kept.push({ code, fallback }) - 1}\0`,
        );
      },
      mdxjsEsm: drop,
      yaml: drop,
      toml: drop,
      heading: (node) => stringifyHeadingId(s, node, headingIds),
      // elements are kept in function output only
      ...(jsx && { mdxJsxFlowElement: keep, mdxJsxTextElement: keep }),
      after(root, ctx) {
        const text = s.stringify(root).trim();
        const value = text ? `${text}\n` : '';

        if (!jsx) {
          // string output only keeps expressions, `data.markdown` uses their fallbacks
          ctx.data.markdown ??= value.replace(
            markerRegex,
            (_, i: string) => (kept[Number(i)] as { fallback: string }).fallback,
          );
          if (as)
            ctx.prependChild(root, {
              type: 'mdxjsEsm',
              value: `export const ${as} = ${toStringCode(value, kept)};`,
            });
          return;
        }
        if (!as) return;

        const body = kept.length > 0 ? `<>${toCode(value, kept)}</>` : JSON.stringify(value);
        ctx.prependChild(root, {
          type: 'mdxjsEsm',
          value: toComponentCode(as, body, kept.length > 0),
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

/** Markdown with the markers of expressions as one string */
function toStringCode(text: string, kept: Kept[]): string {
  // text & the indexes of expressions, alternating
  const parts = text.split(markerRegex);
  let out = JSON.stringify(parts[0]);
  for (let i = 1; i < parts.length; i += 2)
    out += ` + (${(kept[Number(parts[i])] as { code: string }).code}) + ${JSON.stringify(parts[i + 1])}`;

  return out;
}

/**
 * Generate the JSX for Markdown with the markers of kept elements & expressions: Markdown becomes string literals, kept
 * elements stay as JSX with `_c.`-prefixed names and their attributes.
 */
function toCode(text: string, kept: Kept[]): string {
  let out = '';
  let idx = 0;
  const pushText = (chunk: string) => {
    if (chunk.trim()) out += `{${JSON.stringify(chunk)}}`;
  };

  for (const match of text.matchAll(markerRegex)) {
    pushText(text.slice(idx, match.index));
    idx = match.index + match[0].length;
    const item = kept[Number(match[1])];
    if (!('open' in item)) {
      out += `{${item.code}}`;
      continue;
    }

    const { open, name, inline, children } = item;
    const element = children ? `${open}>${toCode(children, kept)}</_c.${name}>` : `${open} />`;
    // keep inline elements in inline context when rendered
    out += inline ? `<span>${element}</span>` : element;
  }
  pushText(text.slice(idx));

  return out;
}
