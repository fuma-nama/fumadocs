import type { Element, ElementContent, Text } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type {
  CodeToHastOptions,
  ShikiTransformer,
  ShikiTransformerContextCommon,
  ShikiTransformerContextMeta,
} from 'shiki';
import { ShikiError, splitTokens } from 'shiki/core';
import { rendererRich, type RendererRichOptions, type TwoslashRenderer } from './renderer';
import {
  createTwoslasher,
  type Twoslasher,
  type TwoslasherOptions,
  type TwoslashExecuteOptions,
  type TwoslashReturn,
} from './twoslasher';

declare module 'shiki' {
  interface ShikiTransformerContextMeta {
    twoslash?: TwoslashReturn;
  }
}

export type TwoslashFunction = (
  code: string,
  lang: string,
  options?: TwoslashExecuteOptions,
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
    lang: string,
    options?: TwoslashExecuteOptions,
    meta?: ShikiTransformerContextMeta,
  ) => string | void;

  /**
   * Read cached result
   */
  read: (
    code: string,
    lang: string,
    options?: TwoslashExecuteOptions,
    meta?: ShikiTransformerContextMeta,
  ) => TwoslashReturn | null | undefined;

  /**
   * Save result to cache
   */
  write: (
    code: string,
    data: TwoslashReturn,
    lang: string,
    options?: TwoslashExecuteOptions,
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
   * Custom renderer to decide how each info should be rendered, replaces the default renderer and `rendererRich` options.
   */
  renderer?: TwoslashRenderer;
  /**
   * Options for the default renderer.
   */
  rendererRich?: RendererRichOptions;
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

/** class of elements to skip when copying the code block */
const ignoreClass = 'nd-copy-ignore';
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
    renderer = createRenderer(options.rendererRich),
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

  // lazy load Twoslash instance so it works on serverless platforms
  const getInstance = () => (cachedInstance ??= createTwoslasher(twoslashOptions));
  const twoslasher: TwoslashFunction =
    options.twoslasher ?? ((code, lang, options) => getInstance()(code, lang, options));
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

  function applyIncludes(code: string): string {
    return code.replaceAll(RE_INCLUDE_MARKER, (_, key: string) => {
      const included = includesMap.get(key);
      if (included === undefined) {
        throw new Error(
          `Could not find an include with the key: '${key}'.\nThere is: ${Array.from(includesMap.keys()).join(', ')}.`,
        );
      }
      return included;
    });
  }

  /**
   * Resolve includes, register the block for `@include`, and normalize the code for the cache
   */
  function prepareCode(
    code: string,
    lang: string,
    hastOptions: CodeToHastOptions,
    meta?: ShikiTransformerContextMeta,
  ): string {
    code = applyIncludes(code);
    const include = RE_INCLUDE_META.exec(hastOptions.meta?.__raw ?? '')?.[1];
    if (include) addInclude(include, code);
    return typesCache?.preprocess?.(code, lang, twoslashOptions, meta) ?? code;
  }

  function getLang(options: CodeToHastOptions): string {
    return langAlias[options.lang] ?? options.lang;
  }

  const results = new WeakMap<object, TwoslashReturn>();
  return {
    name: 'fumadocs:twoslash',
    // analyze the code blocks of documents compiled concurrently in one batch, see `Twoslasher.prepare`
    _fd_prepare(code, hastOptions) {
      if (options.twoslasher) return;
      const lang = getLang(hastOptions);
      if (!filter(lang, code, hastOptions)) return;
      try {
        code = prepareCode(code, lang, hastOptions);
      } catch {
        // reported by `preprocess`
        return;
      }
      if (typesCache?.read(code, lang, twoslashOptions)) return;
      return getInstance().prepare(code, lang, twoslashOptions);
    },
    preprocess(code) {
      const lang = getLang(this.options);
      if (!filter(lang, code, this.options, this)) return;

      try {
        code = prepareCode(code, lang, this.options, this.meta);
        let result = typesCache?.read(code, lang, twoslashOptions, this.meta);
        if (!result) {
          result = twoslasher(code, lang, twoslashOptions, this.meta);
          typesCache?.write(code, result, lang, twoslashOptions, this.meta);
        }
        results.set(this.meta, result);
        this.meta.twoslash = result;
        return result.code;
      } catch (error) {
        const replaced = onTwoslashError(error, code, lang, this.options);
        if (typeof replaced === 'string') return replaced;
      }
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
      const shikiError = (message: string) =>
        onShikiError(new Error(message), this.source, this.options.lang);

      function insertAfterLine(line: number, nodes: ElementContent[]) {
        if (nodes.length === 0) return;
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
        // the line break, moved after the inserted nodes
        if (after?.type === 'text' && after.value === '\n') codeEl.children.splice(index + 1, 1);
        codeEl.children.splice(index + 1, 0, ...nodes);
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
        wrap: (tokens: ElementContent[]) => ElementContent[],
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
        lineEl.children.splice(start, targets.length, ...wrap(targets));
      }

      const skipHover = new Set<Text>();
      const hovers: (() => void)[] = [];
      const wraps: (() => void)[] = [];
      for (const node of result.nodes) {
        if (node.type === 'tag') {
          if (renderer.lineCustomTag) {
            insertAfterLine(node.line, renderer.lineCustomTag.call(this, node));
          }
          continue;
        }

        const tokens = locateTextTokens(node.line, node.character, node.length);
        if (tokens.length === 0 && !(node.type === 'error' && renderer.nodesError)) {
          shikiError(`Cannot find tokens for node: ${JSON.stringify(node)}`);
          continue;
        }

        switch (node.type) {
          case 'error':
            if (renderer.nodeError) {
              for (const token of tokens) {
                skipHover.add(token);
                Object.assign(token, renderer.nodeError.call(this, node, { ...token }));
              }
            }
            if (renderer.nodesError) {
              for (const token of tokens) skipHover.add(token);
              wraps.push(() =>
                wrapTokens(
                  node.line,
                  node.character,
                  node.length,
                  (targets) => renderer.nodesError!.call(this, node, targets) ?? targets,
                ),
              );
            }
            if (renderer.lineError) insertAfterLine(node.line, renderer.lineError.call(this, node));
            break;
          case 'query': {
            const token = tokens[0];
            if (token && renderer.nodeQuery) {
              skipHover.add(token);
              Object.assign(token, renderer.nodeQuery.call(this, node, { ...token }));
            }
            if (renderer.lineQuery) {
              insertAfterLine(node.line, renderer.lineQuery.call(this, node, token));
            }
            break;
          }
          case 'completion':
            if (renderer.nodeCompletion) {
              for (const token of tokens) {
                skipHover.add(token);
                Object.assign(token, renderer.nodeCompletion.call(this, node, { ...token }));
              }
            }
            if (renderer.lineCompletion) {
              insertAfterLine(node.line, renderer.lineCompletion.call(this, node));
            }
            break;
          case 'highlight':
            if (renderer.nodesHighlight) {
              wraps.push(() =>
                wrapTokens(
                  node.line,
                  node.character,
                  node.length,
                  (targets) => renderer.nodesHighlight!.call(this, node, targets) ?? targets,
                ),
              );
            }
            break;
          case 'hover':
            hovers.push(() => {
              for (const token of tokens) {
                if (skipHover.has(token)) continue;
                skipHover.add(token);
                Object.assign(token, renderer.nodeStaticInfo.call(this, node, { ...token }));
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

/**
 * The rich renderer with the popups rendered by `fumadocs-twoslash/ui`
 */
function createRenderer(options: RendererRichOptions = {}): TwoslashRenderer {
  return rendererRich({
    classExtra: ignoreClass,
    queryRendering: 'line',
    renderMarkdown,
    renderMarkdownInline,
    ...options,
    hast: {
      hoverToken: {
        tagName: 'Popup',
      },
      hoverPopup: {
        tagName: 'PopupContent',
        properties: {
          class: ignoreClass,
        },
      },
      hoverCompose: ({ popup, token }) => [
        popup,
        {
          type: 'element',
          tagName: 'PopupTrigger',
          properties: {},
          children: [token],
        },
      ],
      popupDocs: {
        class: 'prose twoslash-popup-docs',
      },
      popupTypes: {
        tagName: 'div',
        class: 'twoslash shiki fd-codeblock prose-no-margin',
        children: (v) => {
          if (v.length === 1 && v[0].type === 'element' && v[0].tagName === 'pre') return v;

          return [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                class: 'twoslash-popup-code',
              },
              children: v,
            },
          ];
        },
      },
      popupDocsTags: {
        class: 'prose twoslash-popup-docs twoslash-popup-docs-tags',
      },
      nodesHighlight: {
        class: 'highlighted-word twoslash-highlighted',
      },
      ...options.hast,
    },
  });
}

export function renderMarkdown(this: ShikiTransformerContextCommon, md: string): ElementContent[] {
  // replace jsdoc links
  const mdast = fromMarkdown(md.replace(/{@link (?<link>[^}]*)}/g, '$1'));

  const onCode = (lang: string, node: Code) => {
    return this.codeToHast(node.value, {
      ...this.options,
      transformers: [],
      meta: node.meta ? { __raw: node.meta } : {},
      lang,
    }).children[0] as Element;
  };

  return (
    toHast(mdast, {
      handlers: {
        code: (state, node: Code) => {
          const lang = node.lang;
          if (!lang) return defaultHandlers.code(state, node);

          try {
            return onCode(lang, node);
          } catch (e) {
            const def = defaultHandlers.code(state, node);

            if (e instanceof ShikiError) {
              this.meta._fd_postprocess ??= [];
              this.meta._fd_postprocess.push(async ({ highlighter }) => {
                await highlighter.loadLanguage(lang as never);
                Object.assign(def, onCode(lang, node));
              });

              return def;
            }

            if (e instanceof Error) {
              console.error(
                `[fumadocs-twoslash] encountered an error when highlighting codeblock in a Twoslash popup: ${e.message}`,
              );
            }

            return def;
          }
        },
      },
    }) as Element
  ).children;
}

export function renderMarkdownInline(
  this: ShikiTransformerContextCommon,
  md: string,
  context?: string,
): ElementContent[] {
  const value = context === 'tag:param' ? md.replace(/^(?<link>[\w$-]+)/, '`$1` ') : md;

  const children = renderMarkdown.call(this, value);
  if (children.length === 1 && children[0].type === 'element' && children[0].tagName === 'p')
    return children[0].children;
  return children;
}
