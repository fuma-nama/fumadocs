import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';

export function renderMarkdown(md: string): React.ReactElement {
  const mdast = fromMarkdown(
    md.replace(/{@link (?<link>[^}]*)}/g, '$1'), // replace jsdoc links
    { mdastExtensions: [gfmFromMarkdown()] },
  );

  return toJsxRuntime(toHast(mdast), {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx as Jsx,
    jsxs: runtime.jsxs as Jsx,
  });
}
