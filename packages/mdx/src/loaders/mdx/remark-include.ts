import { type Processor, type Transformer, unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Code, Node, Root, RootContent } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fumaMatter } from '@/utils/fuma-matter';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';
import type { DataMap } from 'vfile';
import type { Directives } from 'mdast-util-directive';
import { remarkMarkAndUnravel } from '@/loaders/mdx/remark-unravel';
import { flattenNode } from './mdast-utils';

export interface Params {
  lang?: string;
  meta?: string;
}

const ElementLikeTypes: ElementLikeContent['type'][] = [
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'containerDirective',
  'textDirective',
  'leafDirective',
];
type ElementLikeContent = MdxJsxFlowElement | MdxJsxTextElement | Directives;

function isElementLike(node: Node): node is ElementLikeContent {
  return ElementLikeTypes.includes(node.type as ElementLikeContent['type']);
}

function parseElementAttributes(
  element: ElementLikeContent,
): Record<string, string | null | undefined> {
  if (Array.isArray(element.attributes)) {
    const attributes: Record<string, string | null> = {};

    for (const attr of element.attributes) {
      if (
        attr.type === 'mdxJsxAttribute' &&
        (typeof attr.value === 'string' || attr.value === null)
      ) {
        attributes[attr.name] = attr.value;
      }
    }

    return attributes;
  }

  return element.attributes ?? {};
}

function parseSpecifier(specifier: string): {
  file: string;
  section?: string;
} {
  const idx = specifier.lastIndexOf('#');
  if (idx === -1) return { file: specifier };

  return {
    file: specifier.slice(0, idx),
    section: specifier.slice(idx + 1),
  };
}

function extractSection(root: Root, section: string): Root | undefined {
  let nodes: RootContent[] | undefined;
  let capturingHeadingContent = false;

  visit(root, (node) => {
    if (node.type === 'heading') {
      if (capturingHeadingContent) {
        return false;
      }

      if (node.data?.hProperties?.id === section) {
        capturingHeadingContent = true;
        nodes = [node];
        return 'skip';
      }

      return;
    }

    if (capturingHeadingContent) {
      nodes?.push(node as RootContent);
      return 'skip';
    }

    if (isElementLike(node) && node.name === 'section') {
      const attributes = parseElementAttributes(node);

      if (attributes.id === section) {
        nodes = node.children;
        return false;
      }
    }
  });

  if (nodes)
    return {
      type: 'root',
      children: nodes,
    };
}

export function remarkInclude(this: Processor): Transformer<Root, Root> {
  const TagName = 'include';

  const embedContent = async (
    file: string,
    heading: string | undefined,
    params: Params,
    data: Partial<DataMap>,
  ) => {
    let content: string;
    try {
      content = (await fs.readFile(file)).toString();
    } catch (e) {
      throw new Error(
        `failed to read file ${file}\n${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }

    const ext = path.extname(file);
    data._compiler?.addDependency(file);

    if (params.lang || (ext !== '.md' && ext !== '.mdx')) {
      const lang = params.lang ?? ext.slice(1);

      return {
        type: 'code',
        lang,
        meta: params.meta,
        value: content,
        data: {},
      } satisfies Code;
    }

    const parser = data._getProcessor
      ? data._getProcessor(ext === '.mdx' ? 'mdx' : 'md')
      : this;
    const parsed = fumaMatter(content);
    let mdast = parser.parse({
      path: file,
      value: parsed.content,
      data: { frontmatter: parsed.data as Record<string, unknown> },
    }) as Root;
    const baseProcessor = unified().use(remarkMarkAndUnravel);

    if (heading) {
      // parse headings before extraction
      const extracted = extractSection(
        await baseProcessor.use(remarkHeading).run(mdast),
        heading,
      );
      if (!extracted)
        throw new Error(
          `Cannot find section ${heading} in ${file}, make sure you have encapsulated the section in a <section id="${heading}"> tag, or a :::section directive with remark-directive configured.`,
        );

      mdast = extracted;
    } else {
      mdast = await baseProcessor.run(mdast);
    }

    await update(mdast, path.dirname(file), data);
    return mdast;
  };

  async function update(tree: Root, directory: string, data: Partial<DataMap>) {
    const queue: Promise<void>[] = [];

    visit(tree, ElementLikeTypes, (_node, _, parent) => {
      const node = _node as ElementLikeContent;
      if (node.name !== TagName) return;

      const specifier = flattenNode(node);
      if (specifier.length === 0) return 'skip';

      const attributes = parseElementAttributes(node);
      const { file: relativePath, section } = parseSpecifier(specifier);
      const file = path.resolve(
        'cwd' in attributes ? process.cwd() : directory,
        relativePath,
      );

      queue.push(
        embedContent(file, section, attributes, data).then((replace) => {
          Object.assign(
            parent && parent.type === 'paragraph' ? parent : node,
            replace,
          );
        }),
      );

      return 'skip';
    });

    await Promise.all(queue);
  }

  return async (tree, file) => {
    await update(tree, path.dirname(file.path), file.data);
  };
}
