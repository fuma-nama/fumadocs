import { createContentHighlighter } from '@/search';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import type { Content, Html, Image, Parent, Root, Table } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import type { SortedResult } from '@/search';
import type { Highlighter, SearchHit } from './types';
import { highlightCodeBlock, parseCodeBlock } from './code';

const contentProcessor = remark().use(remarkGfm).use(remarkMdx);
const lenientContentProcessor = remark().use(remarkGfm);

function parseContent(text: string): { tree: Root; processor: typeof contentProcessor } {
  try {
    return { tree: contentProcessor.parse(text) as Root, processor: contentProcessor };
  } catch {
    return {
      tree: lenientContentProcessor.parse(text) as Root,
      processor: lenientContentProcessor,
    };
  }
}

export async function mapHitsToSortedResults(
  hits: SearchHit[],
  query: string,
  transformUrl: (url: string) => string = (url) => url,
): Promise<SortedResult[]> {
  const highlighter = createContentHighlighter(query);
  const results: SortedResult[] = [];
  const seenSections = new Set<string>();
  let previousSectionKey: string | undefined;
  let idCounter = 0;

  for (const hit of hits) {
    const url = transformUrl(hit.url);
    const heading = hit.heading ?? '';
    const sectionKey = `${hit.pageTitle} ${heading}`;

    const contentMatched =
      (hit._formatted?.rawContent ?? '').includes('<mark>') ||
      (hit._formatted?.content ?? '').includes('<mark>');

    if (!contentMatched && seenSections.has(sectionKey)) {
      continue;
    }

    if (sectionKey !== previousSectionKey) {
      results.push({
        id: `${url}_${idCounter++}`,
        type: 'page',
        content: highlighter.highlightMarkdown(heading),
        breadcrumbs: [hit.pageTitle],
        url,
      });
    }

    seenSections.add(sectionKey);
    previousSectionKey = sectionKey;

    if (!contentMatched) {
      continue;
    }

    const codeBlock = parseCodeBlock(hit.rawContent);
    const content = codeBlock
      ? await highlightCodeBlock(codeBlock, query)
      : renderContent(hit.rawContent, highlighter);

    results.push({
      id: `${url}_${idCounter++}`,
      type: 'text',
      content,
      url,
    });
  }

  return results;
}

function renderContent(rawContent: string, highlighter: Highlighter): string {
  const { tree, processor } = parseContent(highlightInlineText(rawContent));

  replaceNodes(
    tree,
    (node): node is MdxJsxFlowElement | MdxJsxTextElement | MdxjsEsm =>
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxJsxTextElement' ||
      node.type === 'mdxjsEsm',
    (node) => mdxNodeToContent(node),
  );

  replaceNodes(
    tree,
    (node): node is Table => node.type === 'table',
    (node) => tableToHtml(node, highlighter),
  );

  replaceNodes(
    tree,
    (node): node is Image => node.type === 'image' || node.type === 'imageReference',
    () => [],
  );

  replaceNodes(
    tree,
    (node): node is Html => node.type === 'html',
    (node) => stripJsxMarkup(node.value.replace(RAW_HTML_IMAGE_RE, '')),
  );

  return highlighter.highlightMarkdown(processor.stringify(tree).trim());
}

const MARK_SEGMENT_RE = /(<mark>[^<]+<\/mark>)/g;

function processHighlightedContent(delimiter: string, highlightedContent: string): string {
  let result = '';

  for (const part of highlightedContent.split(MARK_SEGMENT_RE)) {
    if (!part) continue;
    if (part.startsWith('<mark>')) {
      result += part;
      continue;
    }

    const leading = /^\s*/.exec(part)![0];
    const trailing = /\s*$/.exec(part)![0];
    const text = part.slice(leading.length, part.length - trailing.length);

    result += text ? leading + delimiter + text + delimiter + trailing : part;
  }

  return result;
}

function highlightInlineText(content: string): string {
  const blockPattern = /(`+|\*+|_+)([\s\S]*?)\1/g;

  return content.replace(blockPattern, (_, openDelimiter, innerContent) => {
    if (openDelimiter === '*' && innerContent.startsWith(' ')) {
      return openDelimiter + innerContent + openDelimiter;
    }
    if (!innerContent.includes('<mark>')) {
      return openDelimiter + innerContent + openDelimiter;
    }
    const textOnly = innerContent.replace(/<[^>]+>/g, '');
    if (textOnly.length >= content.length) {
      return openDelimiter + innerContent + openDelimiter;
    }

    return processHighlightedContent(openDelimiter, innerContent);
  });
}

const RAW_HTML_IMAGE_RE = /!\[([^\]]*)\](?:\([^)]*\)|\[[^\]]*\])?/g;
const JSX_TAG_RE = /<(\/?)([A-Z][\w.]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
const JSX_ATTR_TEXT_RE = /(?:title|description|label)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function stripJsxMarkup(value: string): Content[] {
  const attributeTexts: string[] = [];
  const stripped = value
    .replace(JSX_TAG_RE, (_, _closing, _name, attrs: string) => {
      for (const match of attrs.matchAll(JSX_ATTR_TEXT_RE)) {
        const text = (match[1] ?? match[2] ?? '').replace(/<\/?mark>/g, '');
        if (text) attributeTexts.push(text);
      }
      return '';
    })
    .trim();

  const content: Content[] = attributeTexts.map(boldParagraph);
  if (stripped) {
    content.push({ type: 'html', value: stripped });
  }
  return content;
}
function replaceNodes<T extends Content>(
  tree: Root,
  predicate: (node: Content) => node is T,
  replace: (node: T) => Content | Content[],
): void {
  const walk = (parent: Parent) => {
    parent.children = parent.children.flatMap((child) => {
      if (predicate(child)) {
        const replaced = replace(child);
        const nodes = Array.isArray(replaced) ? replaced : [replaced];
        for (const node of nodes) {
          if ('children' in node) walk(node as Parent);
        }
        return nodes;
      }
      if ('children' in child) walk(child as Parent);
      return child;
    });
  };
  walk(tree);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightText(value: string, highlighter: Highlighter): string {
  return highlighter
    .highlight(value)
    .map((segment) =>
      segment.styles?.highlight
        ? `<mark>${escapeHtml(segment.content)}</mark>`
        : escapeHtml(segment.content),
    )
    .join('');
}

function cellContentToHtml(node: unknown, highlighter: Highlighter): string {
  if (node == null || typeof node !== 'object') return '';
  const n = node as { type?: string; value?: unknown; children?: unknown[] };

  switch (n.type) {
    case 'text':
      return highlightText(String(n.value ?? ''), highlighter);
    case 'inlineCode':
      return `<code>${highlightText(String(n.value ?? ''), highlighter)}</code>`;
    case 'html':
      return String(n.value ?? '');
    case 'break':
      return '<br />';
    case 'image':
    case 'imageReference':
      return '';
  }

  if (Array.isArray(n.children)) {
    const inner = n.children.map((child) => cellContentToHtml(child, highlighter)).join('');
    switch (n.type) {
      case 'strong':
        return `<strong>${inner}</strong>`;
      case 'emphasis':
        return `<em>${inner}</em>`;
      case 'delete':
        return `<del>${inner}</del>`;
      default:
        return inner;
    }
  }

  return '';
}

function tableToHtml(table: Table, highlighter: Highlighter) {
  const rows = table.children.map((row, rowIndex) => {
    const cellTag = rowIndex === 0 ? 'th' : 'td';
    const cells = row.children
      .map(
        (cell) =>
          `<${cellTag}>${cell.children.map((child) => cellContentToHtml(child, highlighter)).join('')}</${cellTag}>`,
      )
      .join('');
    return `<tr>${cells}</tr>`;
  });

  return {
    type: 'html' as const,
    value: `<table><thead>${rows[0]}</thead><tbody>${rows.slice(1).join('')}</tbody></table>`,
  };
}

const MDX_TEXT_ATTRIBUTES = ['title', 'description', 'label'];

function boldParagraph(text: string): Content {
  return {
    type: 'paragraph',
    children: [{ type: 'strong', children: [{ type: 'text', value: text }] }],
  };
}

function mdxAttributeText(node: MdxJsxFlowElement | MdxJsxTextElement, name: string): string {
  for (const attr of node.attributes) {
    if (attr.type !== 'mdxJsxAttribute' || attr.name !== name) continue;
    if (typeof attr.value === 'string') return attr.value.replace(/<\/?mark>/g, '');
  }
  return '';
}

function mdxNodeToContent(node: MdxJsxFlowElement | MdxJsxTextElement | MdxjsEsm): Content[] {
  if (!('children' in node)) return [];

  const content: Content[] = [];
  for (const name of MDX_TEXT_ATTRIBUTES) {
    const text = mdxAttributeText(node, name);
    if (text) {
      content.push(boldParagraph(text));
    }
  }
  content.push(...node.children);
  return content;
}
