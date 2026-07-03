import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { defineMdastPlugin, mdxToMdast, markdownToMdast } from 'satteri';
import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { flattenNode } from '@fumadocs/satteri';
import type { Code, RootContent } from 'mdast';
import type { CompilerOptions } from '@/loaders/mdx/build-mdx';

export function remarkIncludeSatteri({ cwd }: { cwd?: string } = {}): MdastPluginDefinition {
  const cache = new Map<string, Promise<RootContent | RootContent[]>>();

  return defineMdastPlugin({
    name: 'remark-include',
    async mdxJsxFlowElement(node, ctx) {
      if (node.name !== 'include') return;
      await replaceInclude(node, ctx, cwd, cache);
    },
    async containerDirective(node, ctx) {
      if (node.name !== 'include') return;
      await replaceInclude(node, ctx, cwd, cache);
    },
  });
}

async function replaceInclude(
  node: RootContent,
  ctx: MdastVisitorContext,
  cwd: string | undefined,
  cache: Map<string, Promise<RootContent | RootContent[]>>,
) {
  const specifier = flattenNode(node).trim();
  if (!specifier) return;

  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined) return;

  const { file: relativePath, section } = parseSpecifier(specifier);
  const baseDir = ctx.fileURL ? path.dirname(fileURLToPath(ctx.fileURL)) : cwd ?? process.cwd();
  const targetPath = path.resolve(baseDir, relativePath);

  const compiler = ctx.data._compiler as CompilerOptions | undefined;
  compiler?.addDependency(targetPath);

  const key = `${targetPath}#${section ?? ''}`;
  let replacement = cache.get(key);
  if (!replacement) {
    replacement = loadReplacement(targetPath, section);
    cache.set(key, replacement);
  }

  const resolved = await replacement;
  if (Array.isArray(resolved)) {
    const children = [...parent.children];
    children.splice(index, 1, ...resolved);
    ctx.setProperty(parent, 'children', children);
  } else {
    ctx.replaceNode(node, resolved);
  }
}

async function loadReplacement(targetPath: string, section?: string) {
  const ext = path.extname(targetPath);

  if (ext !== '.md' && ext !== '.mdx') {
    const content = await fsRead(targetPath);
    return {
      type: 'code',
      lang: ext.slice(1),
      value: content,
    } satisfies Code;
  }

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
    return extracted;
  }

  return tree.children;
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
  let nodes: RootContent[] | undefined;
  let capturing = false;

  for (const node of children) {
    if (node.type === 'heading') {
      if (capturing) break;
      const id = (node.data as { hProperties?: { id?: string } } | undefined)?.hProperties?.id;
      if (id === section) {
        capturing = true;
        nodes = [node];
      }
      continue;
    }

    if (capturing) nodes?.push(node);
  }

  return nodes;
}
