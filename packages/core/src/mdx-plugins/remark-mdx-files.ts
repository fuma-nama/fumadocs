import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { VFile } from 'vfile';
import path from 'node:path';

export interface FileNode {
  depth: number;
  type: 'file';
  name: string;
}

export interface FolderNode {
  depth: number;
  type: 'folder';
  name: string;
  children: Node[];
}

export interface ToMdxOptions {
  defaultOpenAll: boolean;
}

type Node = FileNode | FolderNode;

export interface RemarkMdxFilesOptions {
  /**
   * @defaultValue files
   */
  lang?: string;
  toMdx?: (node: Node, options: ToMdxOptions) => MdxJsxFlowElement;
}

interface AutoFilesProps extends Partial<ToMdxOptions> {
  dir?: string;
  patterns?: string[];
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

function defaultToMDX(node: Node, options: ToMdxOptions, depth = 0): MdxJsxFlowElement {
  if (depth === 0) {
    return {
      type: 'mdxJsxFlowElement',
      name: 'Files',
      attributes: [],
      children: [defaultToMDX(node, options, depth + 1)],
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

  if (options.defaultOpenAll) {
    attributes.push({
      type: 'mdxJsxAttribute',
      name: 'defaultOpen',
      value: null,
    });
  }

  return {
    type: 'mdxJsxFlowElement',
    attributes,
    name: 'Folder',
    children: node.children.map((item) => defaultToMDX(item, options, depth + 1)),
  };
}

/**
 *
 * **Files CodeBlock:**
 *
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
 * into MDX `<Files />` component.
 *
 * **Auto Files:**
 *
 * Generates MDX `<Files />` component from file system.
 *
 * ```mdx
 * <auto-files dir="scripts" pattern="my-dir/*" defaultOpenAll />
 * ```
 */
export function remarkMdxFiles(options: RemarkMdxFilesOptions = {}): Transformer<Root, Root> {
  const { lang = 'files', toMdx = defaultToMDX } = options;

  async function autoFiles(
    file: VFile,
    node: MdxJsxFlowElement,
    { patterns, dir, defaultOpenAll = false }: AutoFilesProps,
  ) {
    const { glob } = await import('tinyglobby');
    if (!patterns) {
      file.fail('Missing `pattern` prop in <auto-files>', {
        place: node.position,
      });
    }

    const baseDir = file.dirname ?? file.cwd;
    const cwd = dir ? path.join(baseDir, dir) : baseDir;
    const files = await glob(patterns, { cwd });
    Object.assign(node, toMdx(buildFileTreeFromGlob(cwd, files), { defaultOpenAll }));
  }

  return async (tree, file) => {
    const queue: Promise<void>[] = [];

    visit(tree, ['code', 'mdxJsxFlowElement'] as const, (node) => {
      if (node.type === 'code') {
        if (node.lang !== lang || !node.value) return;

        const fileTree = parseFileTree(node.value);
        if (!fileTree) return;

        Object.assign(
          node,
          toMdx(fileTree, {
            defaultOpenAll: true,
          }),
        );
        return 'skip';
      }

      if (node.type === 'mdxJsxFlowElement') {
        if (node.name !== 'auto-files') return;
        const parsed: AutoFilesProps = {};
        for (const attr of node.attributes) {
          if (attr.type !== 'mdxJsxAttribute') continue;
          const { name, value } = attr;

          switch (name) {
            case 'dir':
              if (typeof value === 'string') parsed.dir = value;
              break;
            case 'pattern':
              if (typeof value === 'string') {
                parsed.patterns ??= [];
                parsed.patterns.push(value);
              }
              break;
            case 'defaultOpenAll':
              parsed.defaultOpenAll = true;
              break;
          }
        }

        queue.push(autoFiles(file, node, parsed));
        return 'skip';
      }
    });

    await Promise.all(queue);
  };
}

function buildFileTreeFromGlob(dir: string, files: string[]): Node {
  const nodeMap = new Map<string, FolderNode>();
  const root: FolderNode = {
    depth: 0,
    type: 'folder',
    name: path.basename(dir),
    children: [],
  };
  nodeMap.set('', root);

  for (const file of files) {
    const parts = path
      .normalize(file)
      .split(path.sep)
      .filter((part) => part.length > 0);
    let currentPath = '';
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const nextPath = path.join(currentPath, name);

      if (i === parts.length - 1) {
        // Add file node.
        const fileNode: FileNode = { depth: i + 1, type: 'file', name };
        current.children.push(fileNode);
      } else {
        // Add or retrieve folder node using the map.
        let folder = nodeMap.get(nextPath);

        if (!folder) {
          folder = { depth: i + 1, type: 'folder', name, children: [] };
          nodeMap.set(nextPath, folder);
          current.children.push(folder);
        }

        current = folder;
        currentPath = nextPath;
      }
    }
  }

  return root;
}
