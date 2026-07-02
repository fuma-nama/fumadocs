import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import Slugger from 'github-slugger';
import { defineMdastPlugin, mdxToMdast, markdownToMdast } from 'satteri';
import type { MdastVisitorContext } from 'satteri';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { flattenNode } from '@fumadocs/satteri';
import type { Code, RootContent } from 'mdast';
import type { Directives } from 'mdast-util-directive';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { CompilerOptions } from '@/loaders/mdx/build-mdx';

type IncludeNode = RootContent | MdxJsxFlowElement | MdxJsxTextElement | Directives;

function parseElementAttributes(
  element: IncludeNode,
): Record<string, string | null | undefined> {
  if (!('attributes' in element)) return {};
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

export function remarkIncludeSatteri({ cwd }: { cwd?: string } = {}) {
  return defineMdastPlugin({
    name: 'remark-include',
    async mdxJsxFlowElement(node, ctx) {
      if (node.name !== 'include') return;
      await replaceInclude(node, ctx, cwd);
    },
    async containerDirective(node, ctx) {
      if (node.name !== 'include') return;
      await replaceInclude(node, ctx, cwd);
    },
  });
}

async function replaceInclude(node: IncludeNode, ctx: MdastVisitorContext, cwd?: string) {
  const specifier = flattenNode(node).trim();
  if (!specifier) return;

  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined) return;

  const attributes = parseElementAttributes(node);
  const { file: relativePath, section } = parseSpecifier(specifier);
  const baseDir =
    'cwd' in attributes
      ? (cwd ?? process.cwd())
      : ctx.fileURL
        ? path.dirname(fileURLToPath(ctx.fileURL))
        : (cwd ?? process.cwd());
  const targetPath = path.resolve(baseDir, relativePath);

  const compiler = ctx.data._compiler as CompilerOptions | undefined;
  compiler?.addDependency(targetPath);

  const ext = path.extname(targetPath);
  let replacement: RootContent | RootContent[];

  if (ext !== '.md' && ext !== '.mdx') {
    const content = await fsRead(targetPath);
    replacement = {
      type: 'code',
      lang: attributes.lang ?? ext.slice(1),
      meta: attributes.meta ?? undefined,
      value: content,
    } satisfies Code;
  } else {
    const content = await fsRead(targetPath);
    const parsed = frontmatter(content);
    const parse = ext === '.mdx' ? mdxToMdast : markdownToMdast;
    const tree = parse(parsed.content, {
      features: { gfm: true, directive: true, headingAttributes: true },
    }) as { children: RootContent[] };

    if (section) {
      const extracted = extractSection(tree.children, section);
      if (!extracted) {
        throw new Error(`Cannot find section ${section} in ${targetPath}`);
      }
      replacement = extracted;
    } else {
      replacement = tree.children;
    }
  }

  if (Array.isArray(replacement)) {
    if (replacement.length === 0) {
      ctx.removeNode(node);
    } else {
      ctx.replaceNode(node, replacement[0]!);
      if (replacement.length > 1) ctx.insertAfter(replacement[0]!, replacement.slice(1));
    }
  } else {
    ctx.replaceNode(node, replacement);
  }
}

async function fsRead(file: string) {
  const { readFile } = await import('node:fs/promises');
  return readFile(file, 'utf-8');
}

function parseSpecifier(specifier: string) {
  const idx = specifier.lastIndexOf('#');
  if (idx === -1) return { file: specifier };
  return { file: specifier.slice(0, idx), section: specifier.slice(idx + 1) };
}

function extractSection(children: RootContent[], section: string): RootContent[] | undefined {
  const slugger = new Slugger();
  let nodes: RootContent[] | undefined;
  let capturing = false;

  for (const node of children) {
    if (node.type === 'heading') {
      if (capturing) break;
      const id =
        (node.data as { hProperties?: { id?: string } } | undefined)?.hProperties?.id ??
        slugger.slug(flattenNode(node));
      if (id === section) {
        capturing = true;
        nodes = [node];
      }
      continue;
    }

    if (
      (node.type === 'mdxJsxFlowElement' || node.type === 'containerDirective') &&
      node.name === 'section'
    ) {
      const id = parseElementAttributes(node).id;
      if (id === section) return node.children as RootContent[];
      continue;
    }

    if (capturing) nodes?.push(node);
  }

  return nodes;
}
