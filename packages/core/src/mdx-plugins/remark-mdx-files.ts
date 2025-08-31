import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

interface FileNode {
  depth: number;
  type: 'file';
  name: string;
}

interface FolderNode {
  depth: number;
  type: 'folder';
  name: string;
  children: Node[];
}

type Node = FileNode | FolderNode;

export interface RemarkMdxFilesOptions {
  /**
   * @defaultValue files
   */
  lang?: string;
  toMdx?: (node: Node) => MdxJsxFlowElement;
}

function parseFileTree(code: string) {
  const lines = code.split(/\r?\n/);
  const stack = new Map<number, Node>();

  for (const line of lines) {
    let depth = 0;
    let name = line;
    let match: RegExpMatchArray | null;

    while ((match = /(?:├──|│|└──)\s*/.exec(name))) {
      name = name.slice(match[0].length);
      depth++;
    }

    if (!name) continue;
    const node: Node = name.endsWith('/')
      ? { type: 'folder', name, children: [], depth }
      : { type: 'file', name, depth };

    let parent: Node | undefined;
    for (let i = depth - 1; i >= 0 && !parent; i--) {
      parent = stack.get(i);
    }

    stack.set(depth, node);
    if (!parent) continue;
    if (parent.type === 'file') {
      Object.assign(parent, {
        type: 'folder',
        children: [],
      });
    }

    (parent as FolderNode).children.push(node);
  }

  return stack.get(0);
}

function defaultToMDX(node: Node, depth = 0): MdxJsxFlowElement {
  if (depth === 0) {
    return {
      type: 'mdxJsxFlowElement',
      name: 'Files',
      attributes: [],
      children: [defaultToMDX(node, depth + 1)],
    };
  }

  const attributes: MdxJsxAttribute[] = [
    { type: 'mdxJsxAttribute', name: 'name', value: node.name },
  ];

  if (node.type === 'file') {
    return {
      type: 'mdxJsxFlowElement',
      attributes,
      children: [],
      name: 'File',
    };
  }

  attributes.push({
    type: 'mdxJsxAttribute',
    name: 'defaultOpen',
    value: null,
  });

  return {
    type: 'mdxJsxFlowElement',
    attributes,
    name: 'Folder',
    children: node.children.map((item) => defaultToMDX(item, depth + 1)),
  };
}

/**
 * Convert codeblocks with `files` as lang, like:
 *
 * ```files
 * project
 * ├── src
 * │   ├── index.js
 * │   └── utils
 * │       └── helper.js
 * ├── package.json
 * ```
 *
 * into MDX `<Files />` component
 */
export function remarkMdxFiles(
  options: RemarkMdxFilesOptions = {},
): Transformer<Root, Root> {
  const { lang = 'files', toMdx = defaultToMDX } = options;

  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== lang || !node.value) return;

      const fileTree = parseFileTree(node.value);
      if (!fileTree) return;

      Object.assign(node, toMdx(fileTree));
    });
  };
}
