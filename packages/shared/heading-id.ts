import { and, hasCode, type CodeNode, type CodeOutput } from './code-output';
import { showCondition } from './show';

/** a custom ID at the end of heading text, like `[#id]` */
export const headingIdRegex = /\s*\[#(?<slug>[^]+?)]\s*$/;

/** the code of the IDs from code, by the static ID of their heading: `remarkHeading` shares it in the data of a file */
export type HeadingIds = Record<string, string | undefined>;

/** the default runtime of ID code, function bodies read it from `arguments[0]` like the JSX runtime */
export const headingRuntime = 'fumadocs-core/mdx-plugins/remark-heading.runtime';

interface TextNode {
  type: string;
  value?: unknown;
  children?: readonly TextNode[];
}

/**
 * The text of inline content as code, the items of an array of its parts: authored expressions are values, the
 * content of a branch of `<show>` is there when it shows. Like in React, only strings and numbers are text.
 */
export function textParts(nodes: readonly TextNode[]): string {
  let parts = '';
  for (const node of nodes) {
    const branch = showCondition(node);
    // in its own array, so an expression of comments is no part
    if (node.type === 'mdxTextExpression') parts += `...[${node.value}\n],`;
    else if (branch) parts += `...((${branch}) ? [${textParts(node.children!)}] : []),`;
    else if (node.children) parts += textParts(node.children);
    else if (typeof node.value === 'string') parts += `${JSON.stringify(node.value)},`;
  }
  return parts;
}

/**
 * IDs slugged when rendering, from the first heading that has authored code, or is in or around a branch of `<show>`:
 * only the headings that show count for duplicates.
 *
 * @param runtime - the module that the code imports `createHeadingIds()` from
 */
export function headingIdCode(runtime = headingRuntime) {
  const entries: string[] = [];
  let dynamic = false;

  return {
    /**
     * The code of the ID of the next heading in document order, when it renders from code.
     *
     * @param when - the conditions of the branches around the heading
     */
    next(heading: TextNode & CodeNode, when: string[]): string | undefined {
      const test = and(when);
      if (test || hasCode(heading)) dynamic = true;
      const parts = `[${textParts(heading.children!)}]`;
      entries.push(`(props) => ${test ? `${test} ? ${parts} : null` : parts}`);
      if (dynamic) return `_headingIds(props)[${entries.length - 1}]`;
    },
    /** the ESM code that the IDs from code read */
    get esm(): string | undefined {
      if (dynamic)
        return `import { createHeadingIds as _createHeadingIds } from ${JSON.stringify(runtime)};\nexport const _headingIds = _createHeadingIds([${entries.join(', ')}]);`;
    },
  };
}

/**
 * Write the ID of a heading in processed Markdown, the one that `remarkHeading` gave it unless it has a custom ID.
 *
 * @param ids - the IDs from code, `false` removes custom IDs
 */
export function stringifyHeadingId<N extends CodeNode>(
  { s, expression }: CodeOutput<N>,
  node: N & { data?: unknown; children: readonly N[] },
  ids: HeadingIds | false | undefined,
): void {
  const start = s.range(node)?.start;
  // the content ends with its last child, before the closing sequence or underline
  const last = node.children.at(-1);
  const end = last && s.range(last)?.end;
  if (start === undefined || end === undefined) return;

  const marker = headingIdRegex.exec(s.source.slice(start, end));
  const id = (node.data as { hProperties?: { id?: unknown } } | undefined)?.hProperties?.id;
  if (ids === false) {
    if (marker) s.edit(start + marker.index, end, '', node);
  } else if (typeof id === 'string' && !marker) {
    const code = ids?.[id];
    s.edit(end, end, ` [#${code ? expression(code, id) : id}]`, node);
  }
}
