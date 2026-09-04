import type { Element, ElementContent, Text } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type { ShikiTransformerContext } from 'shiki';
import { ShikiError } from 'shiki/core';
import { completionIcons, tagIcons } from './icons';
import type {
  ErrorLevel,
  NodeCompletion,
  NodeError,
  NodeHover,
  NodeQuery,
  NodeTag,
} from './notations';

/** class of elements to skip when copying the code block */
export const ignoreClass = 'nd-copy-ignore';

const RE_LEADING_MODIFIER = /^\(([\w-]+)\)\s+/gm;
const RE_IMPORT_STATEMENT = /\nimport .*$/;
const RE_INTERFACE_NAMESPACE = /^(interface|namespace) \w+$/gm;
const RE_TYPE = /^[A-Z]\w*(?:<[^>]*>)?:/;
const RE_FUNCTION = /^\w*\(/;

function element(
  tagName: string,
  properties: Element['properties'],
  children: ElementContent[],
): Element {
  return { type: 'element', tagName, properties, children };
}

function text(value: string): Text {
  return { type: 'text', value };
}

/**
 * Clean up the hover text for display, e.g. `(property) Foo.bar: string` -> `Foo.bar: string`
 */
function processHoverInfo(info: string): string {
  const content = info
    .replace(RE_LEADING_MODIFIER, '')
    .replace(RE_IMPORT_STATEMENT, '')
    .replace(RE_INTERFACE_NAMESPACE, '')
    .trim();
  if (RE_TYPE.test(content)) return `type ${content}`;
  if (RE_FUNCTION.test(content)) return `function ${content}`;
  return content;
}

/**
 * The content of a hover popup: highlighted type, docs and JSDoc tags
 */
export function renderPopupContent(
  this: ShikiTransformerContext,
  info: NodeHover | NodeQuery,
): ElementContent[] {
  const content = processHoverInfo(info.text);
  if (!content || content === 'any') return [];

  let lang = this.options.lang;
  if (lang === 'jsx') lang = 'tsx';
  else if (lang === 'js' || lang === 'javascript') lang = 'ts';

  const highlighted = this.codeToHast(content, {
    ...this.options,
    meta: {},
    transformers: [],
    lang,
    structure: content.includes('\n') ? 'classic' : 'inline',
  }).children as ElementContent[];
  const out = [
    element(
      'div',
      { class: 'twoslash shiki fd-codeblock prose-no-margin' },
      highlighted.length === 1 &&
        highlighted[0].type === 'element' &&
        highlighted[0].tagName === 'pre'
        ? highlighted
        : [element('code', { class: 'twoslash-popup-code' }, highlighted)],
    ),
  ];

  if (info.docs) {
    out.push(
      element('div', { class: 'prose twoslash-popup-docs' }, renderMarkdown.call(this, info.docs)),
    );
  }
  if (info.tags?.length) {
    out.push(
      element(
        'div',
        { class: 'prose twoslash-popup-docs twoslash-popup-docs-tags' },
        info.tags.map(([name, value]) =>
          element('span', { class: 'twoslash-popup-docs-tag' }, [
            element('span', { class: 'twoslash-popup-docs-tag-name' }, [text(`@${name}`)]),
            ...(value
              ? [
                  element(
                    'span',
                    { class: 'twoslash-popup-docs-tag-value' },
                    renderMarkdownInline.call(this, value, `tag:${name}`),
                  ),
                ]
              : []),
          ]),
        ),
      ),
    );
  }
  return out;
}

/**
 * Wrap the token in a popup, rendered by the `Popup` components of `fumadocs-twoslash/ui`
 */
export function renderHover(
  this: ShikiTransformerContext,
  info: NodeHover,
  token: ElementContent,
): ElementContent {
  const content = renderPopupContent.call(this, info);
  if (content.length === 0) return token;

  return element('Popup', {}, [
    element('PopupContent', { class: ignoreClass }, content),
    element('PopupTrigger', {}, [token]),
  ]);
}

export function renderQueryToken(token: ElementContent): Element {
  return element('span', { class: 'twoslash-hover' }, [token]);
}

/**
 * The persisted popup of `^?`, inserted after the line
 */
export function renderQueryLine(
  this: ShikiTransformerContext,
  query: NodeQuery,
  targetText: string,
): Element {
  const offset = Math.max(0, query.character + Math.floor(targetText.length / 2) - 2);
  return element('div', { class: `twoslash-meta-line twoslash-query-line ${ignoreClass}` }, [
    element('span', {}, [text(' '.repeat(offset))]),
    element('span', { class: `twoslash-popup-container ${ignoreClass}` }, [
      element('div', { class: 'twoslash-popup-arrow' }, []),
      ...renderPopupContent.call(this, query),
    ]),
  ]);
}

export function renderCompletion(query: NodeCompletion, token: Text): Element {
  const { completionsPrefix: prefix } = query;
  const items = query.completions.map((item) => {
    const kind = item.kind ?? 'default';
    const matched = item.name.startsWith(prefix);
    return element('li', {}, [
      element('span', { class: `twoslash-completions-icon completions-${kind}` }, [
        completionIcons[kind] ?? completionIcons.property,
      ]),
      element('span', {}, [
        element('span', { class: 'twoslash-completions-matched' }, [text(matched ? prefix : '')]),
        element('span', { class: 'twoslash-completions-unmatched' }, [
          text(matched ? item.name.slice(prefix.length) : item.name),
        ]),
      ]),
    ]);
  });

  return element('span', {}, [
    ...(token.value ? [text(token.value)] : []),
    element('span', { class: `twoslash-completion-cursor ${ignoreClass}` }, [
      element('ul', { class: `twoslash-completion-list ${ignoreClass}` }, items),
    ]),
  ]);
}

const errorLevelClass: Record<ErrorLevel, string> = {
  error: '',
  warning: 'twoslash-error-level-warning',
  suggestion: 'twoslash-error-level-suggestion',
  message: 'twoslash-error-level-message',
};

export function renderErrorTokens(error: NodeError, tokens: ElementContent[]): Element {
  return element(
    'span',
    { class: `twoslash-error ${errorLevelClass[error.level]}`.trim() },
    tokens,
  );
}

export function renderErrorLine(error: NodeError): Element {
  const className = `twoslash-meta-line twoslash-error-line ${errorLevelClass[error.level]} ${ignoreClass}`;
  return element('div', { class: className.replace('  ', ' ') }, [text(error.text)]);
}

export function renderTagLine(tag: NodeTag): Element {
  return element(
    'div',
    { class: `twoslash-tag-line twoslash-tag-${tag.name}-line ${ignoreClass}` },
    [
      element('span', { class: `twoslash-tag-icon tag-${tag.name}-icon` }, [tagIcons[tag.name]]),
      text(tag.text ?? ''),
    ],
  );
}

export function renderHighlight(tokens: ElementContent[]): Element {
  return element('span', { class: 'highlighted-word twoslash-highlighted' }, tokens);
}

export function renderMarkdown(this: ShikiTransformerContext, md: string): ElementContent[] {
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

function renderMarkdownInline(
  this: ShikiTransformerContext,
  md: string,
  context?: string,
): ElementContent[] {
  const value = context === 'tag:param' ? md.replace(/^(?<link>[\w$-]+)/, '`$1` ') : md;

  const children = renderMarkdown.call(this, value);
  if (children.length === 1 && children[0].type === 'element' && children[0].tagName === 'p')
    return children[0].children;
  return children;
}
