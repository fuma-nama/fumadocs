import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import Slugger from 'github-slugger';
import type { Code, Heading, Nodes, Root, RootContent } from 'mdast';
import type { Processor, Transformer } from 'unified';
import type { VFile } from 'vfile';
import { frontmatter } from '@/content/md/frontmatter';
import { headingIdRegex } from './heading-id';
import { embedSource, replaceSource } from './stringifier';
import { flattenNode, walk } from './utils';

export interface RemarkIncludeOptions {
  /**
   * The processor to parse an included Markdown or MDX file with.
   *
   * @defaultValue the current processor
   */
  getProcessor?: (format: 'md' | 'mdx') => Pick<Processor, 'parse'>;
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs: remark-include] the host compiler, included files are added as its dependencies.
     */
    _compiler?: { addDependency: (file: string) => void };
  }
}

type ElementLike = Extract<
  Nodes,
  {
    type:
      | 'mdxJsxFlowElement'
      | 'mdxJsxTextElement'
      | 'containerDirective'
      | 'leafDirective'
      | 'textDirective';
  }
>;

const elementLikeTypes = new Set<string>([
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'containerDirective',
  'leafDirective',
  'textDirective',
]);

function isElementLike(node: Nodes): node is ElementLike {
  return elementLikeTypes.has(node.type);
}

/**
 * Embed other files with `<include>./file.mdx</include>` or the `include` directives, Markdown & MDX files as
 * content, other files as code blocks.
 */
export function remarkInclude(
  this: Processor,
  { getProcessor = () => this }: RemarkIncludeOptions = {},
): Transformer<Root, Root> {
  /** replace the includes in `tree`, relative paths are resolved from `dir` */
  async function update(tree: Root, dir: string, file: VFile, stack: string[]): Promise<void> {
    const queue: Promise<void>[] = [];

    walk<Nodes>(tree, (node, _, parent) => {
      if (!isElementLike(node) || node.name !== 'include') return;
      const specifier = flattenNode(node).trim();
      if (!specifier) return 'skip';

      const attributes = parseElementAttributes(node);
      const idx = specifier.lastIndexOf('#');
      const targetPath = path.resolve(
        'cwd' in attributes ? file.cwd : dir,
        idx === -1 ? specifier : specifier.slice(0, idx),
      );
      const section = idx === -1 ? undefined : specifier.slice(idx + 1);
      // the replacement is block content, so it replaces the paragraph of an inline element
      const host = parent as Nodes | undefined;
      const target = host?.type === 'paragraph' ? host : node;

      queue.push(
        embed(target, targetPath, section, attributes, file, stack).then((replace) => {
          // the node keeps its position for the stringifier
          const { position } = target;
          for (const key in target) delete target[key as keyof Nodes];
          Object.assign(target, replace, { position });
        }),
      );
      return 'skip';
    });

    await Promise.all(queue);
  }

  async function embed(
    target: Nodes,
    targetPath: string,
    section: string | undefined,
    attributes: Record<string, string | null | undefined>,
    file: VFile,
    stack: string[],
  ): Promise<Root | Code> {
    if (stack.includes(targetPath))
      throw new Error(`Circular include detected: ${[...stack, targetPath].join(' -> ')}`);

    // before reading, so a missing file is watched too
    file.data._compiler?.addDependency(targetPath);
    let content: string;
    try {
      content = await fs.readFile(targetPath, 'utf-8');
    } catch (e) {
      throw new Error(
        `failed to read file ${targetPath}\n${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }

    const ext = path.extname(targetPath);
    if (attributes.lang || (ext !== '.md' && ext !== '.mdx')) {
      const lang = attributes.lang ?? ext.slice(1);
      const value = section ? extractCodeRegion(content, section) : content.replace(/\r?\n$/, '');
      if (value === undefined) throw new Error(`Region "${section}" not found in ${targetPath}`);

      let fence = '```';
      while (value.includes(fence)) fence += '`';
      replaceSource(
        file,
        target,
        `${fence}${lang}${attributes.meta ? ` ${attributes.meta}` : ''}\n${value}\n${fence}`,
      );
      return { type: 'code', lang, meta: attributes.meta, value };
    }

    const source = frontmatter(content).content;
    const tree = getProcessor(ext === '.mdx' ? 'mdx' : 'md').parse(source) as Root;
    unravel(tree);
    if (section) {
      const children = extractSection(tree, section);
      if (!children)
        throw new Error(
          `Cannot find section ${section} in ${targetPath}, make sure you have encapsulated the section in a <section id="${section}"> tag, or a :::section directive with remark-directive configured.`,
        );
      tree.children = children;
    }

    embedSource(file, target, source, tree.children);
    await update(tree, path.dirname(targetPath), file, [...stack, targetPath]);
    return tree;
  }

  return (tree, file) => update(tree, file.dirname ?? file.cwd, file, []);
}

function parseElementAttributes(element: ElementLike): Record<string, string | null | undefined> {
  if (!Array.isArray(element.attributes)) return element.attributes ?? {};

  const attributes: Record<string, string | null> = {};
  for (const attr of element.attributes) {
    if (attr.type === 'mdxJsxAttribute' && (typeof attr.value === 'string' || attr.value === null))
      attributes[attr.name] = attr.value;
  }
  return attributes;
}

/**
 * MDX.js unravels paragraphs of only JSX & expressions into flow content before other plugins run, included
 * content needs the same.
 */
function unravel(tree: Root): void {
  walk<Nodes>(tree, (node, index, parent) => {
    if (node.type !== 'paragraph') return;

    let flow = false;
    for (const child of node.children) {
      if (child.type === 'mdxJsxTextElement' || child.type === 'mdxTextExpression') flow = true;
      else if (child.type !== 'text' || child.value.trim()) return 'skip';
    }
    if (!flow || !parent) return 'skip';

    const children: Nodes[] = [];
    for (const child of node.children) {
      if (child.type === 'text' && /^[\t\r\n ]+$/.test(child.value)) continue;
      // mutate because it is faster, the content model is fine
      if (child.type === 'mdxJsxTextElement')
        (child as { type: string }).type = 'mdxJsxFlowElement';
      else if (child.type === 'mdxTextExpression')
        (child as { type: string }).type = 'mdxFlowExpression';
      children.push(child);
    }

    parent.children.splice(index!, 1, ...children);
    // paragraphs only hold phrasing content, nothing in it to unravel
    return 'skip';
  });
}

/** the content in a `<section id>` element, or under a heading by its ID */
function extractSection(tree: Root, section: string): RootContent[] | undefined {
  const slugger = new Slugger();
  let nodes: RootContent[] | undefined;
  let capturing = false;

  walk<Nodes>(tree, (node) => {
    if (nodes && !capturing) return 'skip';

    if (node.type === 'heading') {
      if (capturing) capturing = false;
      else if (headingId(node, slugger) === section) {
        nodes = [node];
        capturing = true;
      }
      return 'skip';
    }

    if (capturing) {
      nodes!.push(node as RootContent);
      return 'skip';
    }

    if (
      isElementLike(node) &&
      node.name === 'section' &&
      parseElementAttributes(node).id === section
    ) {
      nodes = node.children as RootContent[];
      return 'skip';
    }
  });

  return nodes;
}

/** the ID `remark-heading` gives a heading */
function headingId(heading: Heading, slugger: Slugger): string {
  const last = heading.children.at(-1);
  const custom = last?.type === 'text' ? headingIdRegex.exec(last.value)?.[1] : undefined;
  return custom ?? slugger.slug(flattenNode(heading));
}

// VS Code-style regions, adapted from VitePress:
// https://github.com/vuejs/vitepress/blob/main/src/node/markdown/plugins/snippet.ts
const regionMarkers = [
  {
    start: /^\s*\/\/\s*#?region\b\s*(.*?)\s*$/,
    end: /^\s*\/\/\s*#?endregion\b\s*(.*?)\s*$/,
  },
  {
    start: /^\s*<!--\s*#?region\b\s*(.*?)\s*-->/,
    end: /^\s*<!--\s*#?endregion\b\s*(.*?)\s*-->/,
  },
  {
    start: /^\s*\/\*\s*#region\b\s*(.*?)\s*\*\//,
    end: /^\s*\/\*\s*#endregion\b\s*(.*?)\s*\*\//,
  },
  {
    start: /^\s*#[rR]egion\b\s*(.*?)\s*$/,
    end: /^\s*#[eE]nd ?[rR]egion\b\s*(.*?)\s*$/,
  },
  {
    start: /^\s*#\s*#?region\b\s*(.*?)\s*$/,
    end: /^\s*#\s*#?endregion\b\s*(.*?)\s*$/,
  },
  {
    start: /^\s*(?:--|::|@?REM)\s*#region\b\s*(.*?)\s*$/,
    end: /^\s*(?:--|::|@?REM)\s*#endregion\b\s*(.*?)\s*$/,
  },
  {
    start: /^\s*#pragma\s+region\b\s*(.*?)\s*$/,
    end: /^\s*#pragma\s+endregion\b\s*(.*?)\s*$/,
  },
  {
    start: /^\s*\(\*\s*#region\b\s*(.*?)\s*\*\)/,
    end: /^\s*\(\*\s*#endregion\b\s*(.*?)\s*\*\)/,
  },
];

/** the dedented lines of a VS Code-style region (e.g. `// #region name`) in code */
export function extractCodeRegion(content: string, region: string): string | undefined {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const marker of regionMarkers) {
      if (marker.start.exec(lines[i])?.[1] !== region) continue;

      let depth = 1;
      const extracted: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (marker.start.test(lines[j])) {
          depth++;
          continue;
        }

        const end = marker.end.exec(lines[j]);
        if (!end) {
          extracted.push(lines[j]);
          continue;
        }

        if (end[1] === region) depth = 0;
        else if (end[1] === '') depth--;
        if (depth === 0) return dedent(extracted);
      }
    }
  }
}

function dedent(lines: string[]): string {
  let indent = Infinity;
  for (const line of lines) {
    const start = line.search(/\S/);
    if (start !== -1) indent = Math.min(indent, start);
  }

  if (indent !== Infinity) for (let i = 0; i < lines.length; i++) lines[i] = lines[i].slice(indent);
  return lines.join('\n');
}
