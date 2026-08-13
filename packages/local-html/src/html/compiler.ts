import { fromHtml } from 'hast-util-from-html';
import { visit, SKIP } from 'unist-util-visit';
import Slugger from 'github-slugger';
import { rehypeToc, type RehypeTOCItemType } from 'fumadocs-core/mdx-plugins/rehype-toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import { VFile } from 'vfile';
import type { Element, Root } from 'hast';
import type { Processor } from 'unified';

export interface ProcessHtmlOptions {
  /**
   * pick the element holding the page content.
   *
   * by default: the first `<main>`, then `<article>`, then `<body>`, then the whole tree.
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
}

export interface ProcessedHtml {
  tree: Root;
  toc: RehypeTOCItemType[];
  structuredData: StructuredData;
}

/** tags that never carry readable content */
const NonContentTags = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'link',
  'meta',
  'title',
  'base',
]);

/** page chrome, dropped only when no `<main>`/`<article>` scopes the content */
const ChromeTags = new Set(['header', 'footer', 'nav', 'aside']);

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

export function parseHtml(value: string): Root {
  const head = value.slice(0, 1024);

  return fromHtml(value, {
    fragment: !/<!doctype|<html[\s>]/i.test(head),
  });
}

export function textOf(node: Element | Root): string {
  let out = '';

  visit(node, 'text', (text) => {
    out += text.value;
  });

  return out;
}

function findElement(root: Root, tagName: string): Element | undefined {
  let found: Element | undefined;

  visit(root, 'element', (element) => {
    if (element.tagName === tagName) {
      found = element;
      return false;
    }
  });

  return found;
}

export function processHtml(input: Root, options: ProcessHtmlOptions = {}): ProcessedHtml {
  const { selectContent, exclude = [], adaptStyles = true } = options;

  let content: Element | Root | undefined = selectContent?.(input);
  let scoped = content !== undefined;

  if (!content) {
    content = findElement(input, 'main') ?? findElement(input, 'article');
    scoped = content !== undefined;
    content ??= findElement(input, 'body') ?? input;
  }

  const tree: Root = {
    type: 'root',
    children: content.type === 'root' ? content.children : content.children.slice(),
  };

  const excluded = new Set(exclude);
  const slugger = new Slugger();

  visit(tree, 'element', (element, index, parent) => {
    if (
      NonContentTags.has(element.tagName) ||
      excluded.has(element.tagName) ||
      (!scoped && ChromeTags.has(element.tagName))
    ) {
      if (parent && typeof index === 'number') parent.children.splice(index, 1);
      return [SKIP, index];
    }

    for (const key of Object.keys(element.properties)) {
      // inline event handlers never survive the transform
      if (/^on./i.test(key)) delete element.properties[key];
    }

    if (adaptStyles) {
      delete element.properties.className;
      delete element.properties.style;
    }

    if (HeadingTags.has(element.tagName) && typeof element.properties.id !== 'string') {
      const text = textOf(element).trim();
      if (text.length > 0) element.properties.id = slugger.slug(text);
    }
  });

  const file = new VFile();
  const transform = rehypeToc.call(undefined as unknown as Processor, {
    exportToc: { as: 'data' },
  });
  transform(tree, file, () => undefined);

  return {
    tree,
    toc: file.data.rehypeToc ?? [],
    structuredData: buildStructuredData(tree),
  };
}

function buildStructuredData(tree: Root): StructuredData {
  const data: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;

  visit(tree, 'element', (element) => {
    if (HeadingTags.has(element.tagName)) {
      const id = element.properties.id;

      if (typeof id === 'string') {
        data.headings.push({ id, content: textOf(element).trim() });
        heading = id;
      }

      return SKIP;
    }

    if (TextBlockTags.has(element.tagName)) {
      const content = textOf(element).trim();
      if (content.length > 0) data.contents.push({ heading, content });

      return SKIP;
    }
  });

  return data;
}
