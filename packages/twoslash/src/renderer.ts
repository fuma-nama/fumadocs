import type { Element, ElementContent, Text } from 'hast';
import type { ShikiTransformerContext, ShikiTransformerContextCommon } from 'shiki';
import { completionIcons, tagIcons } from './icons';
import type {
  NodeCompletion,
  NodeError,
  NodeHighlight,
  NodeHover,
  NodeQuery,
  NodeTag,
} from './notations';

export interface HastExtension {
  tagName?: string;
  properties?: Element['properties'];
  class?: string;
  children?: (input: ElementContent[]) => ElementContent[];
}

export interface RendererRichOptions {
  /**
   * Render JSDoc comments in hover popup.
   *
   * @default true
   */
  jsdoc?: boolean;
  /**
   * Custom icons for completion items, a map from completion item kind to a HAST node.
   *
   * If `false`, no icons will be rendered.
   */
  completionIcons?: Partial<Record<string, ElementContent>> | false;
  /**
   * Custom icons for custom tags lines, a map from tag name to a HAST node.
   *
   * If `false`, no icons will be rendered.
   */
  customTagIcons?: Partial<Record<string, ElementContent>> | false;
  /**
   * Custom formatter for the type info text.
   * Note that it might not be valid TypeScript syntax.
   *
   * @default defaultHoverInfoProcessor
   */
  processHoverInfo?: (info: string) => string;
  /**
   * Custom formatter for the docs text (can be markdown).
   */
  processHoverDocs?: (docs: string) => string;
  /**
   * The way errors should be rendered.
   *
   * - `'line'`: Render the error line after the line of code
   * - `'hover'`: Render the error in the hover popup
   *
   * @default 'line'
   */
  errorRendering?: 'line' | 'hover';
  /**
   * The way query should be rendered.
   *
   * - `'popup'`: Render the query in the absolute popup
   * - `'line'`: Render the query line after the line of code
   *
   * @default 'popup'
   */
  queryRendering?: 'popup' | 'line';
  /**
   * Classes added to injected elements
   */
  classExtra?: string;
  /**
   * Custom function to render markdown. By default it pass-through the markdown.
   */
  renderMarkdown?: (this: ShikiTransformerContextCommon, markdown: string) => ElementContent[];
  /**
   * Custom function to render inline markdown. By default it pass-through the markdown.
   */
  renderMarkdownInline?: (
    this: ShikiTransformerContextCommon,
    markdown: string,
    context: string,
  ) => ElementContent[];
  /**
   * Extensions for the generated HAST tree.
   */
  hast?: {
    /** The <code> block for in the hover popup. */
    popupTypes?: HastExtension;
    /** The documentation block in the hover popup. Can be markdown rendered if `renderMarkdown` is provided. */
    popupDocs?: HastExtension;
    /** The container of jsdoc tags in the hover popup. */
    popupDocsTags?: HastExtension;
    /** The token for the hover information. */
    hoverToken?: HastExtension;
    /** The container of the hover popup. */
    hoverPopup?: HastExtension;
    /** The container of error popup. */
    popupError?: HastExtension;
    /** Custom function to compose the hover token. */
    hoverCompose?: (parts: { popup: Element; token: Text | Element }) => ElementContent[];
    /** The token for the query information. */
    queryToken?: HastExtension;
    /** The container of the query popup. */
    queryPopup?: HastExtension;
    /** Custom function to compose the query token. */
    queryCompose?: (parts: { popup: Element; token: Text | Element }) => ElementContent[];
    /** The token for the completion information. */
    completionToken?: HastExtension;
    /** The cursor element in the completion popup. */
    completionCursor?: HastExtension;
    /** The container of the completion popup. */
    completionPopup?: HastExtension;
    /** Custom function to compose the completion token. */
    completionCompose?: (parts: { popup: Element; cursor: Element }) => ElementContent[];
    /** The token for the error information. */
    errorToken?: HastExtension;
    /** The container of the error popup, only used when `errorRendering` is `'hover'`. */
    errorPopup?: HastExtension;
    /** Custom function to compose the error token, only used when `errorRendering` is `'hover'`. */
    errorCompose?: (parts: { popup: Element; token: Text | Element }) => ElementContent[];
    /** The wrapper for the highlighted nodes. */
    nodesHighlight?: HastExtension;
  };
}

export interface TwoslashRenderer {
  lineError?: (this: ShikiTransformerContext, error: NodeError) => ElementContent[];
  lineCustomTag?: (this: ShikiTransformerContext, tag: NodeTag) => ElementContent[];
  lineQuery?: (
    this: ShikiTransformerContext,
    query: NodeQuery,
    targetNode?: Element | Text,
  ) => ElementContent[];
  lineCompletion?: (this: ShikiTransformerContext, query: NodeCompletion) => ElementContent[];
  nodeStaticInfo: (
    this: ShikiTransformerContext,
    info: NodeHover,
    node: Element | Text,
  ) => Partial<ElementContent>;
  nodeError?: (
    this: ShikiTransformerContext,
    error: NodeError,
    node: Element | Text,
  ) => Partial<ElementContent>;
  nodeQuery?: (
    this: ShikiTransformerContext,
    query: NodeQuery,
    node: Element | Text,
  ) => Partial<ElementContent>;
  nodeCompletion?: (
    this: ShikiTransformerContext,
    query: NodeCompletion,
    node: Element | Text,
  ) => Partial<ElementContent>;
  nodesError?: (
    this: ShikiTransformerContext,
    error: NodeError,
    nodes: ElementContent[],
  ) => ElementContent[];
  nodesHighlight?: (
    this: ShikiTransformerContext,
    highlight: NodeHighlight,
    nodes: ElementContent[],
  ) => ElementContent[];
}

export const defaultCompletionIcons = completionIcons;
export const defaultCustomTagIcons = tagIcons;

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

function extend(extension: HastExtension | undefined, node: Element): Element {
  if (!extension) return node;
  return {
    ...node,
    tagName: extension.tagName ?? node.tagName,
    properties: {
      ...node.properties,
      class: extension.class || node.properties.class,
      ...extension.properties,
    },
    children: extension.children?.(node.children) ?? node.children,
  };
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

function classes(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

function getErrorLevelClass(error: NodeError): string | undefined {
  switch (error.level) {
    case 'warning':
      return 'twoslash-error-level-warning';
    case 'suggestion':
      return 'twoslash-error-level-suggestion';
    case 'message':
      return 'twoslash-error-level-message';
  }
}

function passThrough(markdown: string): ElementContent[] {
  return [text(markdown)];
}

/**
 * The rich renderer, with syntax highlight for the hover info
 */
export function rendererRich(options: RendererRichOptions = {}): TwoslashRenderer {
  const {
    completionIcons = defaultCompletionIcons,
    customTagIcons = defaultCustomTagIcons,
    processHoverInfo = defaultHoverInfoProcessor,
    processHoverDocs = (docs) => docs,
    classExtra,
    jsdoc = true,
    errorRendering = 'line',
    queryRendering = 'popup',
    renderMarkdown = passThrough,
    renderMarkdownInline = passThrough,
    hast,
  } = options;

  function highlightPopupContent(
    this: ShikiTransformerContext,
    info: NodeHover | NodeQuery,
  ): ElementContent[] {
    if (!info.text) return [];
    const content = processHoverInfo(info.text);
    if (!content || content === 'any') return [];

    let lang = this.options.lang;
    if (lang === 'jsx') lang = 'tsx';
    else if (lang === 'js' || lang === 'javascript') lang = 'ts';

    const out = [
      extend(
        hast?.popupTypes,
        element(
          'code',
          { class: 'twoslash-popup-code' },
          this.codeToHast(content, {
            ...this.options,
            meta: {},
            transformers: [],
            lang,
            structure: content.trim().includes('\n') ? 'classic' : 'inline',
          }).children as ElementContent[],
        ),
      ),
    ];

    if (jsdoc && info.docs) {
      const docs = processHoverDocs(info.docs) ?? info.docs;
      if (docs) {
        out.push(
          extend(
            hast?.popupDocs,
            element('div', { class: 'twoslash-popup-docs' }, renderMarkdown.call(this, docs)),
          ),
        );
      }
    }
    if (jsdoc && info.tags?.length) {
      out.push(
        extend(
          hast?.popupDocsTags,
          element(
            'div',
            { class: 'twoslash-popup-docs twoslash-popup-docs-tags' },
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
        ),
      );
    }
    return out;
  }

  return {
    nodeStaticInfo(info, node) {
      const content = highlightPopupContent.call(this, info);
      if (content.length === 0) return node;

      const popup = extend(
        hast?.hoverPopup,
        element('span', { class: classes('twoslash-popup-container', classExtra) }, content),
      );
      return extend(
        hast?.hoverToken,
        element(
          'span',
          { class: 'twoslash-hover' },
          hast?.hoverCompose?.({ popup, token: node }) ?? [popup, node],
        ),
      );
    },
    nodeQuery(query, node) {
      if (!query.text) return {};
      if (queryRendering !== 'popup') {
        return extend(hast?.queryToken, element('span', { class: 'twoslash-hover' }, [node]));
      }

      const popup = extend(
        hast?.queryPopup,
        element('span', { class: classes('twoslash-popup-container', classExtra) }, [
          element('div', { class: 'twoslash-popup-arrow' }, []),
          ...highlightPopupContent.call(this, query),
        ]),
      );
      return extend(
        hast?.queryToken,
        element(
          'span',
          { class: 'twoslash-hover twoslash-query-persisted' },
          hast?.queryCompose?.({ popup, token: node }) ?? [popup, node],
        ),
      );
    },
    nodeCompletion(query, node) {
      if (node.type !== 'text') {
        throw new Error(`Renderer hook nodeCompletion only works on text nodes, got ${node.type}`);
      }
      const { completionsPrefix: prefix } = query;
      const items = query.completions.map((item) => {
        const kind = item.kind ?? 'default';
        const matched = item.name.startsWith(prefix);
        return element('li', {}, [
          ...(completionIcons
            ? [
                element(
                  'span',
                  { class: `twoslash-completions-icon completions-${kind.replaceAll(/\s/g, '-')}` },
                  [completionIcons[kind] ?? completionIcons.property].filter(Boolean) as Element[],
                ),
              ]
            : []),
          element('span', {}, [
            element('span', { class: 'twoslash-completions-matched' }, [
              text(matched ? prefix : ''),
            ]),
            element('span', { class: 'twoslash-completions-unmatched' }, [
              text(matched ? item.name.slice(prefix.length) : item.name),
            ]),
          ]),
        ]);
      });

      const cursor = extend(
        hast?.completionCursor,
        element('span', { class: classes('twoslash-completion-cursor', classExtra) }, []),
      );
      const popup = extend(
        hast?.completionPopup,
        element('ul', { class: classes('twoslash-completion-list', classExtra) }, items),
      );
      const children: ElementContent[] = [];
      if (node.value) children.push(text(node.value));
      if (hast?.completionCompose) children.push(...hast.completionCompose({ popup, cursor }));
      else children.push({ ...cursor, children: [popup] });

      return extend(hast?.completionToken, element('span', {}, children));
    },
    nodesError(error, children) {
      if (errorRendering !== 'hover') {
        return [
          extend(
            hast?.errorToken,
            element(
              'span',
              { class: classes('twoslash-error', getErrorLevelClass(error)) },
              children,
            ),
          ),
        ];
      }

      const popup = extend(
        hast?.errorPopup,
        element('span', { class: classes('twoslash-popup-container', classExtra) }, [
          extend(
            hast?.popupError,
            element(
              'div',
              { class: 'twoslash-popup-error' },
              renderMarkdown.call(this, error.text),
            ),
          ),
        ]),
      );
      const token = element('span', {}, children);
      return [
        extend(
          hast?.errorToken,
          element(
            'span',
            { class: classes('twoslash-error twoslash-error-hover', getErrorLevelClass(error)) },
            hast?.errorCompose?.({ popup, token }) ?? [popup, token],
          ),
        ),
      ];
    },
    lineQuery(query, node) {
      if (queryRendering !== 'line') return [];
      const targetNode = node?.type === 'element' ? node.children[0] : undefined;
      const targetText = targetNode?.type === 'text' ? targetNode.value : '';
      const offset = Math.max(0, query.character + Math.floor(targetText.length / 2) - 2);

      return [
        element('div', { class: classes('twoslash-meta-line twoslash-query-line', classExtra) }, [
          // wrapped for the flex layout of the line
          element('span', {}, [text(' '.repeat(offset))]),
          element('span', { class: classes('twoslash-popup-container', classExtra) }, [
            element('div', { class: 'twoslash-popup-arrow' }, []),
            ...highlightPopupContent.call(this, query),
          ]),
        ]),
      ];
    },
    lineError(error) {
      if (errorRendering !== 'line') return [];
      return [
        element(
          'div',
          {
            class: classes(
              'twoslash-meta-line twoslash-error-line',
              getErrorLevelClass(error),
              classExtra,
            ),
          },
          [text(error.text)],
        ),
      ];
    },
    lineCustomTag(tag) {
      return [
        element(
          'div',
          { class: classes(`twoslash-tag-line twoslash-tag-${tag.name}-line`, classExtra) },
          [
            ...(customTagIcons
              ? [
                  element(
                    'span',
                    { class: `twoslash-tag-icon tag-${tag.name}-icon` },
                    [customTagIcons[tag.name]].filter(Boolean) as Element[],
                  ),
                ]
              : []),
            text(tag.text ?? ''),
          ],
        ),
      ];
    },
    nodesHighlight(_highlight, nodes) {
      return [
        extend(hast?.nodesHighlight, element('span', { class: 'twoslash-highlighted' }, nodes)),
      ];
    },
  };
}
