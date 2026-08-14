import { fromHtml } from 'hast-util-from-html';
import { visit, SKIP } from 'unist-util-visit';
import Slugger from 'github-slugger';
import type { RehypeTOCItemType, StructuredData } from 'fumadocs-core/mdx-plugins';
import type { Element, ElementContent, Properties, Root } from 'hast';
import type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { highlightCode } from './highlight';

export interface ProcessHtmlOptions {
  /**
   * pick the element holding the page content.
   *
   * by default: the only `<main>`, then the only `<article>`, then `<body>`, then the whole tree.
   */
  selectContent?: (root: Root) => Element | Root | undefined;

  /**
   * tag names to drop from the content, on top of the defaults
   */
  exclude?: string[];

  /**
   * remove `class` and `style` attributes so the content adapts to the docs theme
   *
   * @defaultValue true
   */
  adaptStyles?: boolean;

  /**
   * options for Shiki syntax highlighting, `false` to leave code blocks as they are
   */
  rehypeCodeOptions?: RehypeCodeOptions | false;
}

export interface ProcessedHtml {
  tree: Root;
  toc: RehypeTOCItemType[];
  structuredData: StructuredData;
}

/** tags that never carry readable content, or that can embed external/executable content */
const NonContentTags = [
  'script',
  'style',
  'template',
  'noscript',
  'link',
  'meta',
  'title',
  'base',
  'iframe',
  'object',
  'embed',
  'form',
];

/** page chrome, dropped only when no `<main>`/`<article>` scopes the content */
const ChromeTags = ['header', 'footer', 'nav', 'aside'];

const HeadingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** the smallest units of readable text, for search indexing */
const TextBlockTags = new Set([
  'p',
  'li',
  'td',
  'th',
  'figcaption',
  'blockquote',
  'pre',
  'dt',
  'dd',
]);

/** the class name carrying a code block's language, as `highlight.js` and Shiki both write it */
const LanguageClass = /^language-./i;

const UrlProperties = /^(href|xlinkHref|src|srcSet|action|formAction|poster|cite|ping)$/i;
/** protocols that execute their URL, rather than resolving to a document */
const ScriptProtocols = /^\s*(javascript|vbscript):/i;
/** `property-information` camel-cases only known handlers, so match `on` + anything */
const EventHandlers = /^on./i;

export function parseHtml(value: string): Root {
  const head = value.slice(0, 1024);

  return fromHtml(value, {
    fragment: !/<!doctype|<html[\s>]/i.test(head),
  });
}

/** `className` is normally parsed into an array, but a hand-built tree may hold a string */
function toClassNames(value: Properties[string]): string[] {
  if (typeof value === 'string') return value.split(/\s+/);
  if (Array.isArray(value)) return value.map(String);

  return [];
}

export function textOf(node: Element | Root): string {
  let out = '';

  visit(node, 'text', (text) => {
    out += text.value;
  });

  return out;
}

/** the element with this tag name, only when the document has exactly one holding content */
function findScope(root: Root, tagName: string): Element | undefined {
  const found: Element[] = [];

  visit(root, 'element', (element) => {
    if (element.tagName !== tagName) return;
    found.push(element);
    return SKIP;
  });

  const hasContent = (child: ElementContent) =>
    child.type === 'element' || (child.type === 'text' && child.value.trim().length > 0);

  if (found.length === 1 && found[0].children.some(hasContent)) return found[0];
}

export async function processHtml(
  input: Root,
  options: ProcessHtmlOptions = {},
): Promise<ProcessedHtml> {
  const { selectContent, exclude = [], adaptStyles = true, rehypeCodeOptions } = options;
  const scope = selectContent?.(input) ?? findScope(input, 'main') ?? findScope(input, 'article');
  const content = scope ?? findScope(input, 'body') ?? input;
  const dropped = new Set([...NonContentTags, ...exclude, ...(scope ? [] : ChromeTags)]);

  const slugger = new Slugger();
  // seed with the ids of the document, so generated ones cannot collide
  visit(input, 'element', (element) => {
    if (typeof element.properties.id === 'string') slugger.slug(element.properties.id);
  });

  const toc: RehypeTOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;

  function cleanProperties(properties: Properties): Properties {
    const out: Properties = {};

    for (const [key, value] of Object.entries(properties)) {
      if (EventHandlers.test(key)) continue;
      if (adaptStyles && key === 'style') continue;
      if (adaptStyles && key === 'className') {
        // the language of a code block is a hint, not styling: a highlighter needs it
        const languages = toClassNames(value).filter((name) => LanguageClass.test(name));
        if (languages.length > 0) out.className = languages;
        continue;
      }
      if (UrlProperties.test(key) && ScriptProtocols.test(String(value))) continue;

      out[key] = Array.isArray(value) ? [...value] : value;
    }

    return out;
  }

  // copies the children of `parent` (the input may be cached and shared, so it is never
  // mutated), dropping unwanted tags, attributes, and `position` — unused, and most of the tree
  function cleanChildren(parent: Element | Root, inBlock: boolean): ElementContent[] {
    const out: ElementContent[] = [];

    for (const node of parent.children) {
      if (node.type === 'text') out.push({ type: 'text', value: node.value });
      else if (node.type === 'element' && !dropped.has(node.tagName)) {
        out.push(cleanElement(node, inBlock));
      }
    }

    return out;
  }

  function cleanElement(node: Element, inBlock: boolean): Element {
    const isHeading = HeadingTags.has(node.tagName);
    const isBlock = !inBlock && TextBlockTags.has(node.tagName);
    const element: Element = {
      type: 'element',
      tagName: node.tagName,
      properties: cleanProperties(node.properties),
      children: cleanChildren(node, inBlock || isBlock || isHeading),
    };

    // read from the copy: tags dropped above cannot leak into slugs and search
    const content = isHeading || isBlock ? textOf(element).trim() : '';
    if (content.length === 0) return element;

    if (!isHeading) {
      structuredData.contents.push({ heading, content });
      return element;
    }

    const id = element.properties.id;
    heading =
      typeof id === 'string' && id.length > 0
        ? id
        : (element.properties.id = slugger.slug(content));
    structuredData.headings.push({ id: heading, content });
    toc.push({ title: element, url: `#${heading}`, depth: Number(node.tagName[1]) });

    return element;
  }

  const tree: Root = { type: 'root', children: cleanChildren(content, false) };

  return {
    // last, so the highlighted markup keeps the classes and colors it is given, and the code is
    // indexed as it was written
    tree: rehypeCodeOptions === false ? tree : await highlightCode(tree, rehypeCodeOptions),
    toc,
    structuredData,
  };
}
