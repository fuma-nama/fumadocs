import type { Element, ElementContent, Text } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type { ShikiTransformerContext } from 'shiki';
import { ShikiError } from 'shiki/core';
import { completionIcons, tagIcons } from './icons';
import type { NodeCompletion, NodeError, NodeHover, NodeQuery, NodeTag } from './notations';

export interface RendererOptions {
  /**
   * Render JSDoc comments in hover popups.
   *
   * @defaultValue true
   */
  jsdoc?: boolean;
  /**
   * Icons of completion items by kind, merged with the defaults. `false` to render none.
   */
  completionIcons?: Record<string, ElementContent> | false;
  /**
   * Icons of custom tag lines by tag name, merged with the defaults. `false` to render none.
   */
  customTagIcons?: Record<string, ElementContent> | false;
  /**
   * Custom formatter for the type info text, it might not be valid TypeScript syntax.
   *
   * @defaultValue defaultHoverInfoProcessor
   */
  processHoverInfo?: (info: string) => string;
  /**
   * Custom formatter for the docs text (markdown).
   */
  processHoverDocs?: (docs: string) => string;
}

/** class of elements to skip when copying the code block */
export const ignoreClass = 'nd-copy-ignore';

const RE_LEADING_MODIFIER = /^\(([\w-]+)\)\s+/gm;
const RE_IMPORT_STATEMENT = /\nimport .*$/;
const RE_INTERFACE_NAMESPACE = /^(interface|namespace) \w+$/gm;
const RE_TYPE = /^[A-Z]\w*(?:<[^>]*>)?:/;
const RE_FUNCTION = /^\w*\(/;

/**
 * The default hover info processor, which will do some basic cleanup
 */
export function defaultHoverInfoProcessor(type: string): string {
  const content = type
    .replace(RE_LEADING_MODIFIER, '')
    .replace(RE_IMPORT_STATEMENT, '')
    .replace(RE_INTERFACE_NAMESPACE, '')
    .trim();
  if (RE_TYPE.test(content)) return `type ${content}`;
  if (RE_FUNCTION.test(content)) return `function ${content}`;
  return content;
}

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

function errorClass(error: NodeError, base: string): string {
  return error.level === 'error' ? base : `${base} twoslash-error-level-${error.level}`;
}

/**
 * Hast of the type info & docs, with the popups rendered by `fumadocs-twoslash/ui`
 */
export function createRenderer(options: RendererOptions = {}) {
  const { jsdoc = true, processHoverInfo = defaultHoverInfoProcessor, processHoverDocs } = options;
  const completions =
    options.completionIcons === false
      ? undefined
      : { ...completionIcons, ...options.completionIcons };
  const tags =
    options.customTagIcons === false ? undefined : { ...tagIcons, ...options.customTagIcons };

  function popupContent(
    this: ShikiTransformerContext,
    info: NodeHover | NodeQuery,
  ): ElementContent[] {
    if (!info.text) return [];
    const content = processHoverInfo(info.text);
    if (!content || content === 'any') return [];

    let lang = this.options.lang;
    if (lang === 'jsx') lang = 'tsx';
    else if (lang === 'js' || lang === 'javascript') lang = 'ts';
    const multiline = content.trim().includes('\n');
    const types = this.codeToHast(content, {
      ...this.options,
      meta: {},
      transformers: [],
      lang,
      structure: multiline ? 'classic' : 'inline',
    }).children as ElementContent[];

    const out = [
      element('div', { class: 'twoslash shiki fd-codeblock prose-no-margin' }, [
        multiline ? types[0] : element('code', { class: 'twoslash-popup-code' }, types),
      ]),
    ];
    if (!jsdoc) return out;

    const docs = info.docs && (processHoverDocs?.(info.docs) ?? info.docs);
    if (docs) {
      out.push(
        element('div', { class: 'prose twoslash-popup-docs' }, renderMarkdown.call(this, docs)),
      );
    }
    if (info.tags?.length) {
      const children: ElementContent[] = [];
      for (const [name, value] of info.tags) {
        const tag = [
          element('span', { class: 'twoslash-popup-docs-tag-name' }, [text(`@${name}`)]),
        ];
        if (value) {
          tag.push(
            element(
              'span',
              { class: 'twoslash-popup-docs-tag-value' },
              renderMarkdownInline.call(this, value, `tag:${name}`),
            ),
          );
        }
        children.push(element('span', { class: 'twoslash-popup-docs-tag' }, tag));
      }
      out.push(
        element('div', { class: 'prose twoslash-popup-docs twoslash-popup-docs-tags' }, children),
      );
    }
    return out;
  }

  return {
    /**
     * The hover token, `undefined` when there's nothing to display
     */
    hover(this: ShikiTransformerContext, info: NodeHover, token: Text): Element | undefined {
      const content = popupContent.call(this, info);
      if (content.length === 0) return;
      return element('Popup', { class: 'twoslash-hover' }, [
        element('PopupContent', { class: ignoreClass }, content),
        element('PopupTrigger', {}, [token]),
      ]);
    },
    queryToken(token: Text): Element {
      return element('span', { class: 'twoslash-hover' }, [token]);
    },
    queryLine(this: ShikiTransformerContext, query: NodeQuery, target: string): Element {
      const offset = Math.max(0, query.character + Math.floor(target.length / 2) - 2);
      return element('div', { class: `twoslash-meta-line twoslash-query-line ${ignoreClass}` }, [
        // wrapped for the flex layout of the line
        element('span', {}, [text(' '.repeat(offset))]),
        element('span', { class: `twoslash-popup-container ${ignoreClass}` }, [
          element('div', { class: 'twoslash-popup-arrow' }, []),
          ...popupContent.call(this, query),
        ]),
      ]);
    },
    errorToken(error: NodeError, tokens: ElementContent[]): Element {
      return element('span', { class: errorClass(error, 'twoslash-error') }, tokens);
    },
    errorLine(error: NodeError): Element {
      const base = errorClass(error, 'twoslash-meta-line twoslash-error-line');
      return element('div', { class: `${base} ${ignoreClass}` }, [text(error.text)]);
    },
    highlight(tokens: ElementContent[]): Element {
      return element('span', { class: 'highlighted-word twoslash-highlighted' }, tokens);
    },
    completion(query: NodeCompletion, token: Text): Element {
      const { completionsPrefix: prefix } = query;
      const items: ElementContent[] = [];
      for (const item of query.completions) {
        const kind = item.kind ?? 'default';
        const matched = item.name.startsWith(prefix);
        const children: ElementContent[] = [];
        if (completions) {
          const icon = completions[kind] ?? completions.property;
          children.push(
            element(
              'span',
              { class: `twoslash-completions-icon completions-${kind}` },
              icon ? [icon] : [],
            ),
          );
        }
        children.push(
          element('span', {}, [
            element('span', { class: 'twoslash-completions-matched' }, [
              text(matched ? prefix : ''),
            ]),
            element('span', { class: 'twoslash-completions-unmatched' }, [
              text(matched ? item.name.slice(prefix.length) : item.name),
            ]),
          ]),
        );
        items.push(element('li', {}, children));
      }

      const children: ElementContent[] = [];
      if (token.value) children.push(token);
      children.push(
        element('span', { class: `twoslash-completion-cursor ${ignoreClass}` }, [
          element('ul', { class: `twoslash-completion-list ${ignoreClass}` }, items),
        ]),
      );
      return element('span', {}, children);
    },
    tagLine(tag: NodeTag): Element {
      const children: ElementContent[] = [];
      if (tags) {
        const icon = tags[tag.name];
        children.push(
          element('span', { class: `twoslash-tag-icon tag-${tag.name}-icon` }, icon ? [icon] : []),
        );
      }
      children.push(text(tag.text ?? ''));
      return element(
        'div',
        { class: `twoslash-tag-line twoslash-tag-${tag.name}-line ${ignoreClass}` },
        children,
      );
    },
  };
}

export type Renderer = ReturnType<typeof createRenderer>;

function renderMarkdown(this: ShikiTransformerContext, md: string): ElementContent[] {
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
  context: string,
): ElementContent[] {
  const value = context === 'tag:param' ? md.replace(/^(?<link>[\w$-]+)/, '`$1` ') : md;

  const children = renderMarkdown.call(this, value);
  if (children.length === 1 && children[0].type === 'element' && children[0].tagName === 'p')
    return children[0].children;
  return children;
}
