import { type Processor, type Transformer, unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Code, Node, Root, RootContent } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fumaMatter } from '@/utils/fuma-matter';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';
import { VFile } from 'vfile';
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
    targetPath: string,
    heading: string | undefined,
    params: Params,
    parent: VFile,
  ) => {
    const { _getProcessor = () => this, _compiler } = parent.data;
    let content: string;
    try {
      content = (await fs.readFile(targetPath)).toString();
    } catch (e) {
      throw new Error(
        `failed to read file ${targetPath}\n${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }

    const ext = path.extname(targetPath);
    _compiler?.addDependency(targetPath);
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

    const parser = _getProcessor(ext === '.mdx' ? 'mdx' : 'md');
    const parsed = fumaMatter(content);
    const targetFile = new VFile({
      path: targetPath,
      value: parsed.content,
      data: {
        ...parent.data,
        frontmatter: parsed.data as Record<string, unknown>,
      },
    });
    let mdast = parser.parse(targetFile) as Root;
    const baseProcessor = unified().use(remarkMarkAndUnravel);

    if (heading) {
      // parse headings before extraction
      const extracted = extractSection(
        await baseProcessor.use(remarkHeading).run(mdast),
        heading,
      );
      if (!extracted)
        throw new Error(
          `Cannot find section ${heading} in ${targetPath}, make sure you have encapsulated the section in a <section id="${heading}"> tag, or a :::section directive with remark-directive configured.`,
        );

      mdast = extracted;
    } else {
      mdast = await baseProcessor.run(mdast);
    }

    await update(mdast, targetFile);
    return mdast;
  };

  async function update(tree: Root, file: VFile) {
    const queue: Promise<void>[] = [];

    visit(tree, ElementLikeTypes, (_node, _, parent) => {
      const node = _node as ElementLikeContent;
      if (node.name !== TagName) return;

      const specifier = flattenNode(node);
      if (specifier.length === 0) return 'skip';

      const attributes = parseElementAttributes(node);
      const { file: relativePath, section } = parseSpecifier(specifier);
      const targetPath = path.resolve(
        'cwd' in attributes ? file.cwd : file.dirname!,
        relativePath,
      );

      queue.push(
        embedContent(targetPath, section, attributes, file).then((replace) => {
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
    await update(tree, file);
  };
}
