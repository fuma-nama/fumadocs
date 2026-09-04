import type { Element, ElementContent, Text } from 'hast';
import type { ShikiTransformer, ShikiTransformerContextCommon } from 'shiki';
import { splitTokens } from 'shiki/core';
import {
  renderCompletion,
  renderErrorLine,
  renderErrorTokens,
  renderHighlight,
  renderHover,
  renderQueryLine,
  renderQueryToken,
  renderTagLine,
  ignoreClass,
} from './renderer';
import {
  createTwoslasher,
  type Twoslasher,
  type TwoslasherOptions,
  type TwoslashReturn,
} from './twoslasher';

export interface TwoslashTypesCache {
  /**
   * On initialization
   */
  init?: () => void;

  /**
   * Read cached result
   */
  read: (code: string, lang: string) => TwoslashReturn | null | undefined;

  /**
   * Save result to cache
   */
  write: (code: string, data: TwoslashReturn, lang: string) => void;
}

export interface TransformerTwoslashOptions {
  /**
   * Languages to apply this transformer to
   *
   * @defaultValue ['ts', 'tsx']
   */
  langs?: string[];

  /**
   * Cache resolved types, e.g. `createFileSystemTypesCache()` of `fumadocs-twoslash/cache-fs`
   */
  typesCache?: TwoslashTypesCache;

  twoslashOptions?: TwoslasherOptions;
}

const langAlias: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
};

let cachedInstance: Twoslasher | undefined;

/**
 * Apply Twoslash to code blocks with the `twoslash` meta string.
 *
 * This transformer **must** be used with the `rehype-code` plugin of Fumadocs.
 */
export function transformerTwoslash(options: TransformerTwoslashOptions = {}): ShikiTransformer {
  const { langs = ['ts', 'tsx'], typesCache, twoslashOptions } = options;
  // lazy load Twoslash instance so it works on serverless platforms
  const getInstance = () => (cachedInstance ??= createTwoslasher(twoslashOptions));
  typesCache?.init?.();

  function getLang(this: ShikiTransformerContextCommon): string | undefined {
    const lang = langAlias[this.options.lang] ?? this.options.lang;
    const meta = this.options.meta?.__raw ?? '';
    if (!langs.includes(lang) || !/\btwoslash\b/.test(meta) || /no-?twoslash/.test(meta)) return;
    return lang;
  }

  function twoslash(code: string, lang: string): TwoslashReturn {
    let result = typesCache?.read(code, lang);
    if (!result) {
      result = getInstance()(code, lang);
      typesCache?.write(code, result, lang);
    }
    return result;
  }

  const results = new WeakMap<object, TwoslashReturn>();
  return {
    name: 'fumadocs:twoslash',
    // analyze the code blocks of documents compiled concurrently in one batch, see `Twoslasher.prepare`
    _fd_prepare(code, options) {
      const lang = langAlias[options.lang] ?? options.lang;
      const meta = options.meta?.__raw ?? '';
      if (!langs.includes(lang) || !/\btwoslash\b/.test(meta) || /no-?twoslash/.test(meta)) return;
      if (typesCache?.read(code, lang)) return;
      return getInstance().prepare(code, lang);
    },
    preprocess(code) {
      const lang = getLang.call(this);
      if (!lang) return;
      const result = twoslash(code, lang);
      results.set(this.meta, result);
      return result.code;
    },
    tokens(tokens) {
      const result = results.get(this.meta);
      if (!result) return;
      const breakpoints: number[] = [];
      for (const node of result.nodes) {
        if (node.type === 'tag') continue;
        breakpoints.push(node.start, node.start + node.length);
      }
      return splitTokens(tokens, breakpoints);
    },
    pre(pre) {
      if (results.has(this.meta)) this.addClassToHast(pre, 'twoslash lsp');
    },
    code(codeEl) {
      const result = results.get(this.meta);
      if (!result) return;
      const { lines } = this;

      function insertAfterLine(line: number, node: Element) {
        const index =
          line >= lines.length ? codeEl.children.length : codeEl.children.indexOf(lines[line]);
        if (index === -1) return;
        const after = codeEl.children[index + 1];
        // the line break, moved after the inserted node
        if (after?.type === 'text' && after.value === '\n') codeEl.children.splice(index + 1, 1);
        codeEl.children.splice(index + 1, 0, node);
      }

      // positions of text tokens, collected before any of them is replaced
      const textTokens: [line: number, start: number, end: number, token: Text][] = [];
      lines.forEach((lineEl, line) => {
        let index = 0;
        for (const token of lineEl.children) {
          if (token.type !== 'element') continue;
          for (const child of token.children) {
            if (child.type !== 'text') continue;
            textTokens.push([line, index, index + child.value.length, child]);
            index += child.value.length;
          }
        }
      });

      /**
       * The text tokens in the range of the node
       */
      function locateTextTokens(line: number, character: number, length: number): Text[] {
        const out: Text[] = [];
        for (const [l, start, end, token] of textTokens) {
          if (l !== line) continue;
          const inside =
            length === 0
              ? start < character && character <= end
              : character <= start && end <= character + length && start < end;
          if (inside) out.push(token);
        }
        return out;
      }

      /**
       * Wrap the tokens in the range of the node
       */
      function wrapTokens(
        line: number,
        character: number,
        length: number,
        wrap: (tokens: ElementContent[]) => Element,
      ) {
        const lineEl = lines[line];
        if (!lineEl) return;
        let index = 0;
        let start = lineEl.children.length;
        let end = 0;
        lineEl.children.forEach((token, i) => {
          if (index >= character && i < start) start = i;
          if (index <= character + length && i > end) end = i;
          index += getTokenString(token).length;
        });
        if (index <= character + length) end = lineEl.children.length;
        const targets = lineEl.children.slice(start, end);
        lineEl.children.splice(start, targets.length, wrap(targets));
      }

      const hovered = new Set<Text>();
      const hovers: (() => void)[] = [];
      const wraps: (() => void)[] = [];
      for (const node of result.nodes) {
        switch (node.type) {
          case 'tag':
            insertAfterLine(node.line, renderTagLine(node));
            break;
          case 'error': {
            for (const token of locateTextTokens(node.line, node.character, node.length)) {
              hovered.add(token);
            }
            wraps.push(() =>
              wrapTokens(node.line, node.character, node.length, (tokens) =>
                renderErrorTokens(node, tokens),
              ),
            );
            insertAfterLine(node.line, renderErrorLine(node));
            break;
          }
          case 'query': {
            const token = locateTextTokens(node.line, node.character, node.length)[0];
            if (token) {
              hovered.add(token);
              Object.assign(token, renderQueryToken({ ...token }));
            }
            insertAfterLine(node.line, renderQueryLine.call(this, node, token?.value ?? ''));
            break;
          }
          case 'completion':
            for (const token of locateTextTokens(node.line, node.character, node.length)) {
              hovered.add(token);
              Object.assign(token, renderCompletion(node, { ...token }));
            }
            break;
          case 'highlight':
            wraps.push(() => wrapTokens(node.line, node.character, node.length, renderHighlight));
            break;
          case 'hover':
            hovers.push(() => {
              for (const token of locateTextTokens(node.line, node.character, node.length)) {
                if (hovered.has(token)) continue;
                hovered.add(token);
                Object.assign(token, renderHover.call(this, node, { ...token }));
              }
            });
            break;
        }
      }
      for (const fn of hovers) fn();
      for (const fn of wraps) fn();
    },
  };
}

/**
 * The code text of a token, excluding the content of popups
 */
function getTokenString(token: ElementContent): string {
  if (token.type === 'text') return token.value;
  if (token.type !== 'element' || String(token.properties.class).includes(ignoreClass)) return '';
  return token.children.map(getTokenString).join('');
}
