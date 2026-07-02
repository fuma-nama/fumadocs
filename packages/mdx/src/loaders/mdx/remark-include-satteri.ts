import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import Slugger from 'github-slugger';
import { defineMdastPlugin, mdxToMdast, markdownToMdast } from 'satteri';
import type { MdastContent, MdastVisitorContext } from 'satteri';
import '@/loaders/mdx/satteri-data-map';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { flattenNode } from '@fumadocs/satteri';
import type { Code, RootContent } from 'mdast';
import type { Directives } from 'mdast-util-directive';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

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
      return replaceInclude(node, ctx, cwd);
    },
    async containerDirective(node, ctx) {
      if (node.name !== 'include') return;
      return replaceInclude(node, ctx, cwd);
    },
  });
}

async function replaceInclude(
  node: IncludeNode,
  ctx: MdastVisitorContext,
  cwd?: string,
): Promise<MdastContent | void> {
  const specifier = flattenNode(node).trim();
  if (!specifier) return;

  const attributes = parseElementAttributes(node);
  const { file: relativePath, section } = parseSpecifier(specifier);
  const baseDir =
    'cwd' in attributes
      ? (cwd ?? process.cwd())
      : ctx.fileURL
        ? path.dirname(fileURLToPath(ctx.fileURL))
        : (cwd ?? process.cwd());
  const targetPath = path.resolve(baseDir, relativePath);

  const compiler = ctx.data._compiler;
  compiler?.addDependency(targetPath);

  const ext = path.extname(targetPath);
  const content = await fsRead(targetPath);

  if (ext !== '.md' && ext !== '.mdx') {
    let value = content;
    if (section) value = extractCodeRegion(content, section.trim());

    return {
      type: 'code',
      lang: attributes.lang ?? ext.slice(1),
      meta: attributes.meta ?? undefined,
      value,
    } satisfies Code;
  }

  const parsed = frontmatter(content);
  const body = parsed.content;
  const parse = ext === '.mdx' ? mdxToMdast : markdownToMdast;
  const tree = parse(body, {
    features: { gfm: true, directive: true, headingAttributes: true },
  }) as { children: RootContent[] };

  const raw = section
    ? extractSectionRaw(tree.children, section, body)
    : body.trimEnd();

  if (section && raw === undefined) {
    throw new Error(
      `Cannot find section ${section} in ${targetPath}, make sure you have encapsulated the section in a <section id="${section}"> tag, or a :::section directive with remark-directive configured.`,
    );
  }

  return { raw: raw ?? '' };
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

function sliceByPosition(source: string, start?: number, end?: number) {
  if (start === undefined || end === undefined) return undefined;
  return source.slice(start, end);
}

function extractSectionRaw(
  children: RootContent[],
  section: string,
  source: string,
): string | undefined {
  const slugger = new Slugger();
  let capturing = false;
  let start: number | undefined;
  let end: number | undefined;

  for (const node of children) {
    if (node.type === 'heading') {
      if (capturing) break;
      const id =
        (node.data as { hProperties?: { id?: string } } | undefined)?.hProperties?.id ??
        slugger.slug(flattenNode(node));
      if (id === section) {
        capturing = true;
        start = node.position?.start.offset;
      }
      continue;
    }

    if (
      (node.type === 'mdxJsxFlowElement' || node.type === 'containerDirective') &&
      node.name === 'section'
    ) {
      const id = parseElementAttributes(node).id;
      if (id !== section) continue;

      const kids = node.children as RootContent[];
      if (kids.length === 0) return '';
      return sliceByPosition(
        source,
        kids[0]?.position?.start.offset,
        kids[kids.length - 1]?.position?.end.offset,
      );
    }

    if (capturing) end = node.position?.end.offset;
  }

  return sliceByPosition(source, start, end);
}

// VS Code–style region extraction (from remark-include.ts)
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

function dedent(lines: string[]) {
  const minIndent = lines.reduce((min, line) => {
    const match = line.match(/^(\s*)\S/);
    return match ? Math.min(min, match[1].length) : min;
  }, Infinity);

  return minIndent === Infinity
    ? lines.join('\n')
    : lines.map((l) => l.slice(minIndent)).join('\n');
}

function extractCodeRegion(content: string, regionName: string) {
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
        }

        extractedLines.push(lines[j]);
      }
    }
  }

  throw new Error(`Region "${regionName}" not found`);
}
