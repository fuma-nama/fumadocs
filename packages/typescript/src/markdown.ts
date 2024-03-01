import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import {
  type Jsx,
  type Fragment,
  toJsxRuntime,
} from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';

declare module 'react/jsx-runtime' {
  export const Fragment: Fragment;
  export const jsx: Jsx;
  export const jsxs: Jsx;
}

/**
 * @returns html
 */
export function renderMarkdown(md: string): JSX.Element {
  const mdast = fromMarkdown(
    md.replace(/{@link (?<link>[^}]*)}/g, '$1'), // replace jsdoc links
    { mdastExtensions: [gfmFromMarkdown()] },
  );

  return toJsxRuntime(toHast(mdast), {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
  });
}
