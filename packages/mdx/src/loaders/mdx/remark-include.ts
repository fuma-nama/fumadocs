import { type Processor, type Transformer, unified } from 'unified';
import type { Code, Node, Nodes, Root, RootContent } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';
import { VFile } from 'vfile';
import type { Directives } from 'mdast-util-directive';
import { embedSource, replaceSource } from 'fumadocs-core/mdx-plugins/stringifier';
import { remarkMarkAndUnravel } from '@/loaders/mdx/remark-unravel';
import { flattenNode, walk } from './mdast-utils';

/**
 * VS Code–style region extraction
 * Adapted from VitePress:
 * https://github.com/vuejs/vitepress/blob/main/src/node/markdown/plugins/snippet.ts
 */

// region marker regexes
const REGION_MARKERS = [
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

function dedent(lines: string[]): string {
  const minIndent = lines.reduce((min, line) => {
    const match = line.match(/^(\s*)\S/);
    return match ? Math.min(min, match[1].length) : min;
  }, Infinity);

  return minIndent === Infinity
    ? lines.join('\n')
    : lines.map((l) => l.slice(minIndent)).join('\n');
}

function extractCodeRegion(content: string, regionName: string): string {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const re of REGION_MARKERS) {
      let match = re.start.exec(lines[i]);
      if (match?.[1] !== regionName) continue;

      let depth = 1;
      const extractedLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        match = re.start.exec(lines[j]);
        if (match) {
          depth++;
          continue;
        }

        match = re.end.exec(lines[j]);
        if (match) {
          if (match[1] === regionName) depth = 0;
          else if (match[1] === '') depth--;
          else continue;

          if (depth > 0) continue;
          return dedent(extractedLines);
        } else {
          extractedLines.push(lines[j]);
        }
      }
    }
  }
  throw new Error(`Region "${regionName}" not found`);
}

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

  walk<Nodes>(root, (node) => {
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
    target: Nodes,
    targetPath: string,
    heading: string | undefined,
    params: Params,
    parent: VFile,
    root: VFile,
  ) => {
    const { _getProcessor = () => this, _compiler } = parent.data;
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
    _compiler?.addDependency(targetPath);
    // For non-Markdown files, support VS Code–style region extraction
    if (params.lang || (ext !== '.md' && ext !== '.mdx')) {
      const lang = params.lang ?? ext.slice(1);
      let value = content;
      if (heading) {
        value = extractCodeRegion(content, heading.trim());
      }
      let fence = '```';
      while (value.includes(fence)) fence += '`';
      replaceSource(
        root,
        target,
        `${fence}${lang}${params.meta ? ` ${params.meta}` : ''}\n${value.replace(/\r?\n$/, '')}\n${fence}`,
      );

      return {
        type: 'code',
        lang,
        meta: params.meta,
        value,
        data: {},
      } satisfies Code;
    }

    const parser = _getProcessor(ext === '.mdx' ? 'mdx' : 'md');
    const parsed = frontmatter(content);
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
      const extracted = extractSection(await baseProcessor.use(remarkHeading).run(mdast), heading);
      if (!extracted)
        throw new Error(
          `Cannot find section ${heading} in ${targetPath}, make sure you have encapsulated the section in a <section id="${heading}"> tag, or a :::section directive with remark-directive configured.`,
        );

      mdast = extracted;
    } else {
      mdast = await baseProcessor.run(mdast);
    }

    embedSource(root, target, parsed.content, mdast.children);
    await update(mdast, targetFile, root);
    return mdast;
  };

  async function update(tree: Root, file: VFile, root: VFile) {
    const queue: Promise<void>[] = [];

    walk<Nodes>(tree, (node, _, parent) => {
      if (!isElementLike(node) || node.name !== TagName) return;

      const specifier = flattenNode(node);
      if (specifier.length === 0) return 'skip';

      const attributes = parseElementAttributes(node);
      const { file: relativePath, section } = parseSpecifier(specifier);
      const targetPath = path.resolve(
        'cwd' in attributes || !file.dirname ? file.cwd : file.dirname,
        relativePath,
      );

      const host = parent as Nodes | undefined;
      const target = host?.type === 'paragraph' ? host : node;
      queue.push(
        embedContent(target, targetPath, section, attributes, file, root).then((replace) => {
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

  return async (tree, file) => {
    await update(tree, file, file);
  };
}
