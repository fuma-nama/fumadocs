import type { Element, Properties, Root } from 'hast';
import type {
  CodeToHastOptions,
  ShikiTransformer,
  ShikiTransformerContext,
  ShikiTransformerContextCommon,
  ShikiTransformerContextSource,
  ThemedToken,
  TokensResult,
} from 'shiki';
import { codeToTokens, isSupportedLanguage, type Theme } from '@pierre/highlights';
import githubLight from '@pierre/highlights/themes/github-light';
import githubDark from '@pierre/highlights/themes/github-dark';
import type { Highlighter, HighlightCodeOptions } from '.';

export interface HighlightsOptions {
  /**
   * Themes from `@pierre/highlights/themes`, like `{ light: githubLight, dark: githubDark }`.
   *
   * @defaultValue GitHub Light and GitHub Dark
   */
  themes?: Record<string, Theme>;

  /**
   * Shiki transformers, run on the tokens of Highlights as a compatibility layer.
   */
  shikiTransformers?: ShikiTransformer[];
}

export interface HighlightsHighlighter extends Highlighter {
  /** Create a highlighter with `options` in place of its own, like other Shiki transformers. */
  override: (options: HighlightsOptions) => HighlightsHighlighter;
}

/**
 * A highlighter using `@pierre/highlights`, its languages are built in.
 */
export function createHighlights(highlightsOptions: HighlightsOptions = {}): HighlightsHighlighter {
  const { themes = { light: githubLight, dark: githubDark }, shikiTransformers = [] } =
    highlightsOptions;
  // ids of the themes like Shiki, such as `github-light`
  const themeIds: Record<string, string> = {};
  for (const [key, theme] of Object.entries(themes)) {
    themeIds[key] = theme.name.toLowerCase().replaceAll(' ', '-');
  }
  const themeName = `shiki-themes ${Object.values(themeIds).join(' ')}`;

  function tokenize(code: string, lang: string): TokensResult {
    const result = codeToTokens(code, {
      lang: isSupportedLanguage(lang) ? lang : 'text',
      themes,
      defaultColor: false,
      cssVariablePrefix: '--shiki-',
    });

    return { ...result, themeName } as TokensResult;
  }

  function render(code: string, options: CodeToHastOptions): Root {
    const transformers = (options.transformers ?? []).toSorted((a, b) => order(a) - order(b));
    const context: ShikiTransformerContextCommon = {
      meta: {},
      options,
      codeToHast: render,
      codeToTokens: (code, { lang = 'text' }) => tokenize(code, lang),
    };

    for (const transformer of transformers) {
      code = transformer.preprocess?.call(context, code, options) || code;
    }

    const result = tokenize(code, options.lang);
    let tokens = mergeWhitespaces(result.tokens);
    const source: ShikiTransformerContextSource = { ...context, source: code };
    for (const transformer of transformers) {
      tokens = transformer.tokens?.call(source, tokens) || tokens;
    }

    return tokensToHast(tokens, { ...result, ...options }, transformers, source);
  }

  function getCodeOptions(codeOptions: HighlightCodeOptions) {
    return {
      ...codeOptions,
      themes: themeIds,
      defaultColor: false,
      transformers: shikiTransformers,
    } as CodeToHastOptions;
  }

  return {
    codeToHast: (code, codeOptions) => render(code, getCodeOptions(codeOptions)),
    override: (options) => createHighlights({ ...highlightsOptions, ...options }),
  };
}

function order(transformer: ShikiTransformer) {
  if (transformer.enforce === 'pre') return -1;
  if (transformer.enforce === 'post') return 1;
  return 0;
}

/**
 * White space tokens join the next token, like the default `mergeWhitespaces` of Shiki: its transformers
 * expect it, the notations find comment-only lines as lines of one token.
 */
function mergeWhitespaces(lines: ThemedToken[][]): ThemedToken[][] {
  const out: ThemedToken[][] = [];
  for (const line of lines) {
    const merged: ThemedToken[] = [];
    let carry = '';
    let offset = 0;
    for (let i = 0; i < line.length; i++) {
      const token = line[i];
      // underline and strikethrough show on white space
      const mergeable = ((token.fontStyle ?? 0) & 12) === 0;
      if (mergeable && i < line.length - 1 && /^\s+$/.test(token.content)) {
        if (!carry) offset = token.offset;
        carry += token.content;
      } else if (!carry) {
        merged.push(token);
      } else if (mergeable) {
        merged.push({ ...token, offset, content: carry + token.content });
        carry = '';
      } else {
        merged.push({ content: carry, offset }, token);
        carry = '';
      }
    }
    out.push(merged);
  }
  return out;
}

function getTokenStyle(token: ThemedToken): string {
  let style = '';
  for (const key in token.htmlStyle) {
    style += `${style ? ';' : ''}${key}:${token.htmlStyle[key]}`;
  }
  return style;
}

function addClassToHast(node: Element, className: string | string[]): Element {
  if (!className) return node;
  const current = node.properties.class;
  const classes = Array.isArray(current)
    ? current
    : typeof current === 'string'
      ? current.split(/\s+/)
      : [];

  for (const name of Array.isArray(className) ? className : className.split(/\s+/)) {
    if (name && !classes.includes(name)) classes.push(name);
  }
  node.properties.class = classes;
  return node;
}

/**
 * Render Shiki tokens into Shiki's hast structure, with transformers applied.
 */
function tokensToHast(
  tokens: ThemedToken[][],
  options: CodeToHastOptions & Omit<TokensResult, 'tokens'>,
  transformers: ShikiTransformer[],
  source: ShikiTransformerContextSource,
): Root {
  const { structure = 'classic' } = options;
  const properties: Properties = {
    class: `shiki ${options.themeName ?? ''}`,
    style: options.rootStyle || `background-color:${options.bg};color:${options.fg}`,
    tabindex: '0',
  };
  for (const [key, value] of Object.entries(options.meta ?? {})) {
    if (!key.startsWith('_')) properties[key] = value as never;
  }

  const lines: Element[] = [];
  let root: Root = { type: 'root', children: [] };
  let pre: Element = { type: 'element', tagName: 'pre', properties, children: [] };
  let code: Element = { type: 'element', tagName: 'code', properties: {}, children: [] };
  const context: ShikiTransformerContext = {
    ...source,
    structure,
    addClassToHast,
    get tokens() {
      return tokens;
    },
    get root() {
      return root;
    },
    get pre() {
      return pre;
    },
    get code() {
      return code;
    },
    get lines() {
      return lines;
    },
  };

  for (let i = 0; i < tokens.length; i++) {
    let line: Element = {
      type: 'element',
      tagName: 'span',
      properties: { class: 'line' },
      children: [],
    };
    let col = 0;

    for (const token of tokens[i]) {
      let span: Element = {
        type: 'element',
        tagName: 'span',
        properties: { ...token.htmlAttrs },
        children: [{ type: 'text', value: token.content }],
      };
      const style = getTokenStyle(token);
      if (style) span.properties.style = style;

      for (const transformer of transformers) {
        span = transformer.span?.call(context, span, i + 1, col, line, token) || span;
      }
      line.children.push(span);
      col += token.content.length;
    }

    if (structure === 'classic') {
      for (const transformer of transformers) {
        line = transformer.line?.call(context, line, i + 1) || line;
      }
    }
    lines.push(line);
  }

  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && structure === 'classic') code.children.push({ type: 'text', value: '\n' });
    code.children.push(lines[i]);
  }
  for (const transformer of transformers) {
    code = transformer.code?.call(context, code) || code;
  }

  if (structure === 'classic') {
    pre.children.push(code);
    for (const transformer of transformers) {
      pre = transformer.pre?.call(context, pre) || pre;
    }
    root.children.push(pre);
  } else {
    for (let i = 0; i < code.children.length; i++) {
      const line = code.children[i];
      if (i > 0)
        root.children.push({ type: 'element', tagName: 'br', properties: {}, children: [] });
      if (line.type === 'element') root.children.push(...line.children);
    }
  }

  for (const transformer of transformers) {
    root = transformer.root?.call(context, root) || root;
  }
  return root;
}
