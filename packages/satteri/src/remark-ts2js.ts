import { defineMdastPlugin } from 'satteri';
import { fileURLToPath } from 'node:url';
import {
  generateCodeBlockTabs,
  parseCodeBlockAttributes,
} from 'fumadocs-core/mdx-plugins/codeblock-utils';

export interface RemarkTs2jsOptions {
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
 * Transform TypeScript codeblocks into TS/JS tabs. Add `ts2js` to the code fence meta to enable.
 */
export function remarkTs2js({
  persist = false,
  defaultValue = 'ts',
  disableTrigger = false,
}: RemarkTs2jsOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-typescript-to-javascript',
    async code(node, ctx) {
      const lang = node.lang;
      if (lang !== 'ts' && lang !== 'tsx') return;

      const meta = parseCodeBlockAttributes(node.meta ?? '', ['ts2js']);
      if (!disableTrigger && !('ts2js' in meta.attributes)) return;

      const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : 'test';
      const oxc = await import('oxc-transform');
      const result = await oxc.transform(`${filePath}.${lang}`, node.value, {
        sourcemap: false,
        jsx: 'preserve',
      });

      ctx.replaceNode(
        node,
        generateCodeBlockTabs({
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
                  lang: lang === 'tsx' ? 'jsx' : 'js',
                  meta: meta.attributes.ts2js ?? meta.rest,
                  value: result.code,
                },
              ],
            },
          ],
        }),
      );
    },
  });
}
