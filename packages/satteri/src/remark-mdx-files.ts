import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMdastPlugin } from 'satteri';
import type { MdxJsxAttributeNode as MdxJsxAttribute, MdxJsxFlowElement } from 'satteri';
import type {
  FileNode,
  FolderNode,
  RemarkMdxFilesOptions,
  ToMdxOptions,
} from 'fumadocs-core/mdx-plugins/remark-mdx-files';
import { replaceSource } from './stringifier';

export type { RemarkMdxFilesOptions } from 'fumadocs-core/mdx-plugins/remark-mdx-files';

type Node = FileNode | FolderNode;

interface AutoFilesProps extends Partial<ToMdxOptions> {
  dir?: string;
  patterns?: string[];
}

function parseFileTree(code: string) {
  const lines = code.split(/\r?\n/);
  const stack = new Map<number, Node>();
  // top-level entries, several are wrapped in a folder without name
  const roots: Node[] = [];

  for (const line of lines) {
    const name = line.replace(/^[\s│├└─]+/, '');
    if (!name) continue;

    // children start at a later column than their parent
    const column = line.length - name.length;
    let parent: Node | undefined;
    for (let i = column - 1; i >= 0 && !parent; i--) {
      parent = stack.get(i);
    }

    const depth = parent ? parent.depth + 1 : 0;
    const node: Node = name.endsWith('/')
      ? { type: 'folder', name, children: [], depth }
      : { type: 'file', name, depth };
    stack.set(column, node);
    if (!parent) {
      roots.push(node);
      continue;
    }

    if (parent.type === 'file') {
      Object.assign(parent, { type: 'folder', children: [] });
    }

    (parent as FolderNode).children.push(node);
  }

  if (roots.length <= 1) return roots[0];
  return { type: 'folder', name: '', children: roots, depth: -1 } satisfies FolderNode;
}

function buildFileTreeFromGlob(dir: string, files: string[]): Node {
  const nodeMap = new Map<string, FolderNode>();
  const root: FolderNode = { depth: 0, type: 'folder', name: path.basename(dir), children: [] };
  nodeMap.set('', root);

  for (const file of files) {
    const parts = path
      .normalize(file)
      .split(path.sep)
      .filter((part) => part.length > 0);
    let currentPath = '';
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!;
      if (i === parts.length - 1) {
        current.children.push({ depth: i + 1, type: 'file', name });
        continue;
      }

      const nextPath = path.join(currentPath, name);
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

  return root;
}

function defaultToMdx(node: Node, options: ToMdxOptions, depth = 0): MdxJsxFlowElement {
  if (depth === 0) {
    return {
      type: 'mdxJsxFlowElement',
      name: 'Files',
      attributes: [],
      children:
        node.type === 'folder' && node.name === ''
          ? node.children.map((item) => defaultToMdx(item, options, depth + 1))
          : [defaultToMdx(node, options, depth + 1)],
    };
  }

  const attributes: MdxJsxAttribute[] = [
    { type: 'mdxJsxAttribute', name: 'name', value: node.name },
  ];

  if (node.type === 'file') {
    return { type: 'mdxJsxFlowElement', name: 'File', attributes, children: [] };
  }

  if (options.defaultOpenAll) {
    attributes.push({ type: 'mdxJsxAttribute', name: 'defaultOpen', value: null });
  }

  const children: MdxJsxFlowElement[] = [];
  for (const item of node.children) children.push(defaultToMdx(item, options, depth + 1));
  return { type: 'mdxJsxFlowElement', name: 'Folder', attributes, children };
}

/**
 * Convert `files` code blocks into the MDX `<Files />` component, and generate it from the file system with
 * `<auto-files dir="scripts" pattern="my-dir/*" defaultOpenAll />`.
 */
export function remarkMdxFiles({
  lang = 'files',
  toMdx = defaultToMdx,
}: RemarkMdxFilesOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-mdx-files',
    code(node, ctx) {
      if (node.lang !== lang || !node.value) return;

      const fileTree = parseFileTree(node.value);
      if (!fileTree) return;

      // the element is generated, its Markdown is the authored code block
      replaceSource(ctx, node, (s) => s.stringify(node));
      ctx.replaceNode(node, toMdx(fileTree, { defaultOpenAll: true }));
    },
    async mdxJsxFlowElement(node, ctx) {
      if (node.name !== 'auto-files') return;

      const props: AutoFilesProps = {};
      for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute') continue;
        const { name, value } = attr;

        switch (name) {
          case 'dir':
            if (typeof value === 'string') props.dir = value;
            break;
          case 'pattern':
            if (typeof value === 'string') (props.patterns ??= []).push(value);
            break;
          case 'defaultOpenAll':
            props.defaultOpenAll = true;
            break;
        }
      }

      if (!props.patterns) throw new Error('Missing `pattern` prop in <auto-files>');

      const { glob } = await import('tinyglobby');
      const baseDir = ctx.fileURL
        ? path.dirname(fileURLToPath(ctx.fileURL))
        : (ctx.data._cwd ?? process.cwd());
      const cwd = props.dir ? path.join(baseDir, props.dir) : baseDir;
      const files = await glob(props.patterns, { cwd });

      replaceSource(ctx, node, `\`\`\`\n${files.join('\n')}\n\`\`\``);
      ctx.replaceNode(
        node,
        toMdx(buildFileTreeFromGlob(cwd, files), { defaultOpenAll: props.defaultOpenAll ?? false }),
      );
    },
  });
}
