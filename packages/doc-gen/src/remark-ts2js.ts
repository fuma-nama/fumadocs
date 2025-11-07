import type { Transformer } from 'unified';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import {
  generateCodeBlockTabs,
  parseCodeBlockAttributes,
} from 'fumadocs-core/mdx-plugins/codeblock-utils';

export interface TypeScriptToJavaScriptOptions {
  /**
   * Persist Tab value (Fumadocs UI only)
   *
   * @defaultValue false
   */
  persist?:
    | {
        id: string;
      }
    | false;

  defaultValue?: 'js' | 'ts';

  /**
   * Transform all TypeScript codeblocks by default, without a trigger
   */
  disableTrigger?: boolean;
}

/**
 * A remark plugin to transform TypeScript codeblocks into two tabs of codeblocks with its JS variant.
 *
 * Add `ts2js` to enable transformation:
 * ````md
 * ```tsx ts2js
 * import { ReactNode } from "react";
 *
 * export default function Layout({ children }: { children: ReactNode }) {
 *     return <div>{children}</div>
 * }
 * ```
 * ````
 */
export function remarkTypeScriptToJavaScript({
  persist = false,
  defaultValue = 'ts',
  disableTrigger = false,
}: TypeScriptToJavaScriptOptions = {}): Transformer<Root> {
  return async (tree, file) => {
    const oxc = await import('oxc-transform');

    visit(tree, 'code', (node) => {
      const lang = node.lang;
      if (lang !== 'ts' && lang !== 'tsx') return;

      const meta = parseCodeBlockAttributes(node.meta ?? '', ['ts2js']);
      if (!disableTrigger && !('ts2js' in meta.attributes)) return;

      const result = oxc.transform(
        `${file.path ?? 'test'}.${lang}`,
        node.value,
        {
          sourcemap: false,
          jsx: 'preserve',
        },
      );

      const targetLang = lang === 'tsx' ? 'jsx' : 'js';
      const replacement = generateCodeBlockTabs({
        persist,
        defaultValue,
        triggers: [
          {
            value: 'ts',
            children: [{ type: 'text', value: 'TypeScript' }],
          },
          {
            value: 'js',
            children: [{ type: 'text', value: 'JavaScript' }],
          },
        ],
        tabs: [
          {
            value: 'ts',
            children: [
              {
                type: 'code',
                lang: node.lang,
                meta: meta.rest,
                value: node.value,
              },
            ],
          },
          {
            value: 'js',
            children: [
              {
                type: 'code',
                lang: targetLang,
                meta: meta.attributes.ts2js ?? meta.rest,
                value: result.code,
              },
            ],
          },
        ],
      });

      Object.assign(node, replacement);
      return 'skip';
    });
  };
}
