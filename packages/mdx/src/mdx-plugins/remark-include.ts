import { type Processor, type Transformer, unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Code, Root, RootContent } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fumaMatter } from '@/utils/fuma-matter';
import type { DataMap } from '@/utils/build-mdx';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';

export interface Params {
  lang?: string;
  meta?: string;
}

const baseProcessor = unified().use(remarkHeading);

function flattenNode(node: RootContent): string {
  if ('children' in node)
    return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node) return node.value;

  return '';
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

// do a swallow extract
function extractSection(root: Root, section: string): Root | undefined {
  let nodes: RootContent[] | undefined;

  for (const node of root.children) {
    if (
      node.type === 'mdxJsxFlowElement' &&
      node.name === 'section' &&
      node.attributes.some(
        (attr) =>
          attr.type === 'mdxJsxAttribute' &&
          attr.name === 'id' &&
          attr.value === section,
      )
    ) {
      nodes = node.children;
      break;
    }

    if (node.type === 'heading' && node.data?.hProperties?.id === section) {
      nodes = [node];
      continue;
    }

    if (!nodes) continue;
    if (node.type === 'heading') break;
    nodes.push(node);
  }

  if (nodes)
    return {
      type: 'root',
      children: nodes,
    };
}

export function remarkInclude(this: Processor): Transformer<Root, Root> {
  const TagName = 'include';

  async function embedContent(
    file: string,
    heading: string | undefined,
    params: Params,
    data: Partial<DataMap>,
  ) {
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

    const processor = (data._getProcessor ?? getDefaultProcessor)(
      ext === '.mdx' ? 'mdx' : 'md',
    );
    let parsed = await baseProcessor.run(
      processor.parse(fumaMatter(content).content),
    );

    if (heading) {
      const extracted = extractSection(parsed, heading);
      if (!extracted)
        throw new Error(
          `Cannot find section ${heading} in ${file}, make sure you have encapsulated the section in a <section id="${heading}"> tag.`,
        );

      parsed = extracted;
    }

    await update(parsed, path.dirname(file), data);

    return parsed;
  }

  async function update(tree: Root, directory: string, data: Partial<DataMap>) {
    const queue: Promise<void>[] = [];

    visit(
      tree,
      ['mdxJsxFlowElement', 'mdxJsxTextElement'],
      (_node, _, parent) => {
        const node = _node as MdxJsxFlowElement | MdxJsxTextElement;
        if (node.name !== TagName) return;

        const params: Record<string, string | null> = {};
        const specifier = flattenNode(node);
        if (specifier.length === 0) return 'skip';

        for (const attr of node.attributes) {
          if (
            attr.type === 'mdxJsxAttribute' &&
            (typeof attr.value === 'string' || attr.value === null)
          ) {
            params[attr.name] = attr.value;
          }
        }

        const { file: relativePath, section } = parseSpecifier(specifier);

        const file = path.resolve(
          'cwd' in params ? process.cwd() : directory,
          relativePath,
        );

        queue.push(
          embedContent(file, section, params, data).then((replace) => {
            Object.assign(
              parent && parent.type === 'paragraph' ? parent : node,
              replace,
            );
          }),
        );

        return 'skip';
      },
    );

    await Promise.all(queue);
  }

  return async (tree, file) => {
    await update(tree, path.dirname(file.path), file.data);
  };
}

function getDefaultProcessor(format: 'md' | 'mdx') {
  const mdProcessor = unified().use(remarkParse);

  if (format === 'md') return mdProcessor;
  return mdProcessor.use(remarkMdx);
}
