import type { ElementContent, Text } from 'hast';
import type {
  CodeToHastOptions,
  ShikiTransformer,
  ShikiTransformerContextCommon,
  ShikiTransformerContextMeta,
} from 'shiki';
import { splitTokens } from 'shiki/core';
import { createRenderer, ignoreClass, type RendererOptions } from './renderer';
import {
  createTwoslasher,
  type Twoslasher,
  type TwoslasherOptions,
  type TwoslashReturn,
} from './twoslasher';
import type { NodeHover, TwoslashNode } from './notations';

declare module 'shiki' {
  interface ShikiTransformerContextMeta {
    twoslash?: TwoslashReturn;
  }
}

export type TwoslashFunction = (
  code: string,
  lang?: string,
  options?: TwoslasherOptions,
  meta?: ShikiTransformerContextMeta,
) => TwoslashReturn;

export interface TwoslashTypesCache {
  /**
   * On initialization
   */
  init?: () => void;
  /**
   * Preprocess the code before reading the cache, e.g. to normalize it
   */
  preprocess?: (
    code: string,
    lang?: string,
    options?: TwoslasherOptions,
    meta?: ShikiTransformerContextMeta,
  ) => string | void;
  /**
   * Read cached result
   */
  read: (
    code: string,
    lang?: string,
    options?: TwoslasherOptions,
    meta?: ShikiTransformerContextMeta,
  ) => TwoslashReturn | null;
  /**
   * Save result to cache
   */
  write: (
    code: string,
    data: TwoslashReturn,
    lang?: string,
    options?: TwoslasherOptions,
    meta?: ShikiTransformerContextMeta,
  ) => void;
}

export interface TransformerTwoslashOptions {
  /**
   * Languages to apply this transformer to
   *
   * @defaultValue ['ts', 'tsx']
   */
  langs?: string[];
  /**
   * Requires `twoslash` to be presented in the code block meta to apply this transformer
   *
   * @defaultValue true
   */
  explicitTrigger?: boolean | RegExp;
  /**
   * Triggers that skip Twoslash transformation on the code block meta
   *
   * @defaultValue ['notwoslash', 'no-twoslash']
   */
  disableTriggers?: (string | RegExp)[];
  /**
   * Mapping from language alias to language name
   */
  langAlias?: Record<string, string>;
  /**
   * Custom filter function to apply this transformer to.
   * When specified, `langs`, `explicitTrigger`, and `disableTriggers` will be ignored
   */
  filter?: (
    lang: string,
    code: string,
    options: CodeToHastOptions,
    context?: ShikiTransformerContextCommon,
  ) => boolean;
  /**
   * Custom twoslasher function
   */
  twoslasher?: TwoslashFunction;
  /**
   * Options for the twoslasher
   */
  twoslashOptions?: TwoslasherOptions;
  /**
   * Options for the renderer
   */
  rendererRich?: RendererOptions;
  /**
   * A map to store code for `@include` directive.
   * Provide your own instance if you want to clear the map between each transformation
   */
  includesMap?: Map<string, string>;
  /**
   * Strictly throw when there is an error
   *
   * @defaultValue true
   */
  throws?: boolean;
  /**
   * Custom error handler for twoslash errors, when specified, `throws` will be ignored.
   * Optionally return a string to replace the code
   */
  onTwoslashError?: (
    error: unknown,
    code: string,
    lang: string,
    options: CodeToHastOptions,
  ) => string | void;
  /**
   * Custom error handler for Shiki errors, when specified, `throws` will be ignored
   */
  onShikiError?: (error: unknown, code: string, lang: string) => void;
  /**
   * Cache resolved types, e.g. `createFileSystemTypesCache()` of `fumadocs-twoslash/cache-fs`
   */
  typesCache?: TwoslashTypesCache;
}

const RE_TWOSLASH = /\btwoslash\b/;
const RE_INCLUDE_MARKER = /\/\/ @include: (.*)$/gm;
const RE_INCLUDE_META = /include\s+([\w-]+)\b.*/;

let cachedInstance: Twoslasher | undefined;

/**
 * Apply Twoslash to code blocks with the `twoslash` meta string.
 *
 * This transformer **must** be used with the `rehype-code` plugin of Fumadocs.
 */
export function transformerTwoslash(options: TransformerTwoslashOptions = {}): ShikiTransformer {
  const {
    langs = ['ts', 'tsx'],
    twoslashOptions = {},
    langAlias = { typescript: 'ts', json5: 'json', yml: 'yaml' },
    explicitTrigger = true,
    disableTriggers = ['notwoslash', 'no-twoslash'],
    throws = true,
    includesMap = new Map<string, string>(),
    typesCache,
    onTwoslashError = throws
      ? (error) => {
          throw error;
        }
      : () => {},
    onShikiError = throws
      ? (error) => {
          throw error;
        }
      : () => {},
  } = options;
  const trigger = explicitTrigger instanceof RegExp ? explicitTrigger : RE_TWOSLASH;
  const {
    filter = (lang, _code, options) => {
      const meta = options.meta?.__raw ?? '';
      return (
        langs.includes(lang) &&
        (!explicitTrigger || trigger.test(meta)) &&
        !disableTriggers.some((i) => (typeof i === 'string' ? meta.includes(i) : i.test(meta)))
      );
    },
  } = options;
  const renderer = createRenderer(options.rendererRich);

  // lazy load Twoslash instance so it works on serverless platforms
  const getInstance = () => (cachedInstance ??= createTwoslasher(twoslashOptions));
  const twoslasher: TwoslashFunction =
    options.twoslasher ?? ((code, lang) => getInstance()(code, lang));
  /** code blocks prepared by `_fd_prepare`, keyed by the options Shiki passes to both hooks */
  const prepared = new WeakMap<CodeToHastOptions, { code: string; result?: TwoslashReturn }>();
  typesCache?.init?.();

  function addInclude(name: string, code: string) {
    const lines: string[] = [];
    for (const line of code.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('// - ')) {
        const key = trimmed.slice('// - '.length).split(' ')[0];
        includesMap.set(`${name}-${key}`, lines.join('\n'));
      } else {
        lines.push(line);
      }
    }
    includesMap.set(name, lines.join('\n'));
  }

  /**
   * Resolve includes, register the block for `@include`, and read the cache
   */
  function prepare(
    code: string,
    lang: string,
    hastOptions: CodeToHastOptions,
    meta?: ShikiTransformerContextMeta,
  ) {
    code = code.replaceAll(RE_INCLUDE_MARKER, (_, key: string) => {
      const included = includesMap.get(key);
      if (included === undefined) {
        throw new Error(
          `Could not find an include with the key: '${key}'.\nThere is: ${Array.from(includesMap.keys()).join(', ')}.`,
        );
      }
      return included;
    });
    const include = RE_INCLUDE_META.exec(hastOptions.meta?.__raw ?? '')?.[1];
    if (include) addInclude(include, code);
    code = typesCache?.preprocess?.(code, lang, twoslashOptions, meta) ?? code;
    return { code, result: typesCache?.read(code, lang, twoslashOptions, meta) ?? undefined };
  }

  function getLang(options: CodeToHastOptions): string {
    return langAlias[options.lang] ?? options.lang;
  }

  return {
    name: 'fumadocs:twoslash',
    // analyze the code blocks of documents compiled concurrently in one batch, see `Twoslasher.prepare`
    _fd_prepare(code, hastOptions) {
      if (options.twoslasher) return;
      const lang = getLang(hastOptions);
      if (!filter(lang, code, hastOptions)) return;
      let entry;
      try {
        entry = prepare(code, lang, hastOptions);
      } catch {
        // reported by `preprocess`
        return;
      }
      prepared.set(hastOptions, entry);
      if (!entry.result) return getInstance().prepare(entry.code, lang);
    },
    preprocess(code) {
      const lang = getLang(this.options);
      if (!filter(lang, code, this.options, this)) return;

      try {
        const entry = prepared.get(this.options) ?? prepare(code, lang, this.options, this.meta);
        let { result } = entry;
        if (!result) {
          result = twoslasher(entry.code, lang, twoslashOptions, this.meta);
          typesCache?.write(entry.code, result, lang, twoslashOptions, this.meta);
        }
        this.meta.twoslash = result;
        return result.code;
      } catch (error) {
        const replaced = onTwoslashError(error, code, lang, this.options);
        if (typeof replaced === 'string') return replaced;
      }
    },
    tokens(tokens) {
      const result = this.meta.twoslash;
      if (!result) return;
      const breakpoints: number[] = [];
      for (const node of result.nodes) {
        if (node.type === 'tag') continue;
        breakpoints.push(node.start, node.start + node.length);
      }
      return splitTokens(tokens, breakpoints);
    },
    pre(pre) {
      if (this.meta.twoslash) this.addClassToHast(pre, 'twoslash lsp');
    },
    code(codeEl) {
      const result = this.meta.twoslash;
      if (!result) return;
      const { lines } = this;
      const shikiError = (message: string) =>
        onShikiError(new Error(message), this.source, this.options.lang);

      function insertAfterLine(line: number, node: ElementContent) {
        let index: number;
        if (line >= lines.length) {
          index = codeEl.children.length;
        } else {
          index = codeEl.children.indexOf(lines[line]);
          if (index === -1) {
            shikiError(`Cannot find line ${line} in code element`);
            return;
          }
        }
        const after = codeEl.children[index + 1];
        // the line break, moved after the inserted node
        if (after?.type === 'text' && after.value === '\n') codeEl.children.splice(index + 1, 1);
        codeEl.children.splice(index + 1, 0, node);
      }

      // positions of the text tokens of each line, collected before any of them is replaced
      const textTokens: [start: number, end: number, token: Text][][] = [];
      for (const lineEl of lines) {
        const tokens: [number, number, Text][] = [];
        let index = 0;
        for (const token of lineEl.children) {
          if (token.type !== 'element') continue;
          for (const child of token.children) {
            if (child.type !== 'text') continue;
            tokens.push([index, index + child.value.length, child]);
            index += child.value.length;
          }
        }
        textTokens.push(tokens);
      }

      /**
       * The text tokens in the range of the node
       */
      function locateTextTokens({ line, character, length }: TwoslashNode): Text[] {
        const out: Text[] = [];
        for (const [start, end, token] of textTokens[line] ?? []) {
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
        { line, character, length }: TwoslashNode,
        wrap: (tokens: ElementContent[]) => ElementContent,
      ) {
        const lineEl = lines[line];
        if (!lineEl) return;
        let index = 0;
        let start = lineEl.children.length;
        let end = 0;
        for (let i = 0; i < lineEl.children.length; i++) {
          if (index >= character && i < start) start = i;
          if (index <= character + length && i > end) end = i;
          index += getTokenString(lineEl.children[i]).length;
        }
        if (index <= character + length) end = lineEl.children.length;
        const targets = lineEl.children.slice(start, end);
        lineEl.children.splice(start, targets.length, wrap(targets));
      }

      const skipHover = new Set<Text>();
      const hovers: [NodeHover, Text[]][] = [];
      const wraps: (() => void)[] = [];
      for (const node of result.nodes) {
        if (node.type === 'tag') {
          insertAfterLine(node.line, renderer.tagLine(node));
          continue;
        }
        const tokens = locateTextTokens(node);
        if (tokens.length === 0 && node.type !== 'error') {
          shikiError(`Cannot find tokens for node: ${JSON.stringify(node)}`);
          continue;
        }

        switch (node.type) {
          case 'hover':
            hovers.push([node, tokens]);
            break;
          case 'query': {
            const token = tokens[0];
            skipHover.add(token);
            const target = token.value;
            Object.assign(token, renderer.queryToken({ ...token }));
            insertAfterLine(node.line, renderer.queryLine.call(this, node, target));
            break;
          }
          case 'completion':
            for (const token of tokens) {
              skipHover.add(token);
              Object.assign(token, renderer.completion(node, { ...token }));
            }
            break;
          case 'error':
            for (const token of tokens) skipHover.add(token);
            wraps.push(() => wrapTokens(node, (tokens) => renderer.errorToken(node, tokens)));
            insertAfterLine(node.line, renderer.errorLine(node));
            break;
          case 'highlight':
            wraps.push(() => wrapTokens(node, renderer.highlight));
            break;
        }
      }
      // hovers after the other nodes claimed their tokens, wraps after the popups are in place
      for (const [node, tokens] of hovers) {
        for (const token of tokens) {
          if (skipHover.has(token)) continue;
          skipHover.add(token);
          const popup = renderer.hover.call(this, node, { ...token });
          if (popup) Object.assign(token, popup);
        }
      }
      for (const wrap of wraps) wrap();
    },
  };
}

/**
 * The code text of a token, excluding the content of popups
 */
function getTokenString(token: ElementContent): string {
  if (token.type === 'text') return token.value;
  if (token.type !== 'element' || String(token.properties.class).includes(ignoreClass)) return '';
  let text = '';
  for (const child of token.children) text += getTokenString(child);
  return text;
}
