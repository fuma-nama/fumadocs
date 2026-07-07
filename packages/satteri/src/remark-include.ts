import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import Slugger from 'github-slugger';
import { defineMdastPlugin, markdownToMdast, mdxToMdast } from 'satteri';
import type { MdastContent, MdastNode, MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { flattenNode } from '@/utils';
import type { Code, Heading, RootContent } from 'mdast';

export interface RemarkIncludeOptions {
  /**
   * Base directory for includes with the `cwd` attribute, and the fallback
   * when the document has no `fileURL`.
   *
   * @defaultValue process.cwd()
   */
  cwd?: string;
}

/** structural stand-in for JSX elements & directives, which all carry a `name` */
interface IncludeNode {
  type: string;
  name?: string | null;
  attributes?: unknown;
  children?: unknown;
  position?: { start: { offset?: number }; end: { offset?: number } };
}

interface IncludeState {
  cwd: string;
  addDependency: (file: string) => void;
  /** open files, from the entry document to the innermost include */
  stack: string[];
}

const INCLUDE_TYPES = new Set([
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'containerDirective',
  'leafDirective',
  'textDirective',
]);

const PARSE_FEATURES = { gfm: true, directive: true, headingAttributes: true };

/**
 * Sätteri port of fumadocs-mdx's `remark-include`: embed other documents with
 * `<include>./file.mdx</include>` (or the `:::include` / `::include`
 * directives), sections with `<include>./file.mdx#section</include>`, and
 * non-markdown files as code blocks — with VS Code-style `#region` extraction.
 *
 * Nested includes are resolved recursively, relative to the file they appear in.
 */
export function remarkInclude({ cwd }: RemarkIncludeOptions = {}): MdastPluginDefinition {
  async function visit(node: IncludeNode, ctx: MdastVisitorContext): Promise<MdastContent | void> {
    if (node.name !== 'include') return;
    return replaceInclude(node, ctx, cwd);
  }

  async function visitInline(node: IncludeNode, ctx: MdastVisitorContext) {
    if (node.name !== 'include') return;
    const replacement = await replaceInclude(node, ctx, cwd);
    if (!replacement) return;

    // the replacement is block content: replace the wrapping paragraph
    const parent = ctx.parent(node as never);
    if (parent?.type === 'paragraph') {
      ctx.replaceNode(parent, replacement);
      return;
    }
    return replacement;
  }

  return defineMdastPlugin({
    name: 'remark-include',
    mdxJsxFlowElement: visit,
    containerDirective: visit,
    leafDirective: visit,
    mdxJsxTextElement: visitInline,
    textDirective: visitInline,
  }) as MdastPluginDefinition;
}

async function replaceInclude(
  node: IncludeNode,
  ctx: MdastVisitorContext,
  cwdOption?: string,
): Promise<MdastContent | void> {
  const specifier = ctx.textContent(node as never).trim();
  if (!specifier) return;

  const attributes = parseElementAttributes(node);
  const { file: relativePath, section } = parseSpecifier(specifier);
  const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : undefined;
  const cwd = cwdOption ?? process.cwd();
  const baseDir = 'cwd' in attributes || !filePath ? cwd : path.dirname(filePath);
  const targetPath = path.resolve(baseDir, relativePath);

  const state: IncludeState = {
    cwd,
    addDependency: (file) => ctx.data._compiler?.addDependency(file),
    stack: filePath ? [filePath] : [],
  };

  if (isCodeInclude(targetPath, attributes)) {
    return readCodeInclude(targetPath, section, attributes, state);
  }

  const raw = await readMarkdownInclude(targetPath, section, state);
  return { raw };
}

function isCodeInclude(targetPath: string, attributes: Record<string, string | null | undefined>) {
  if (attributes.lang) return true;
  const ext = path.extname(targetPath);
  return ext !== '.md' && ext !== '.mdx';
}

async function readCodeInclude(
  targetPath: string,
  section: string | undefined,
  attributes: Record<string, string | null | undefined>,
  state: IncludeState,
): Promise<Code> {
  const content = await readInclude(targetPath, state);
  let value = content;
  if (section) value = extractCodeRegion(content, section.trim(), targetPath);

  return {
    type: 'code',
    lang: attributes.lang ?? path.extname(targetPath).slice(1),
    meta: attributes.meta ?? undefined,
    value,
  };
}

async function readMarkdownInclude(
  targetPath: string,
  section: string | undefined,
  state: IncludeState,
): Promise<string> {
  if (state.stack.includes(targetPath)) {
    throw new Error(`Circular include detected: ${[...state.stack, targetPath].join(' -> ')}`);
  }

  const content = await readInclude(targetPath, state);
  const body = frontmatter(content).content;
  const ext = path.extname(targetPath);

  let raw: string;
  if (section) {
    const tree = parseTree(body, ext);
    const extracted = extractSectionRaw(tree.children as RootContent[], section, body);
    if (extracted === undefined) {
      throw new Error(
        `Cannot find section ${section} in ${targetPath}, make sure you have encapsulated the section in a <section id="${section}"> tag, or a :::section directive with remark-directive configured.`,
      );
    }
    raw = extracted;
  } else {
    raw = body.trimEnd();
  }

  state.stack.push(targetPath);
  try {
    return await expandNestedIncludes(raw, targetPath, state);
  } finally {
    state.stack.pop();
  }
}

async function readInclude(file: string, state: IncludeState): Promise<string> {
  state.addDependency(file);
  try {
    return await readFile(file, 'utf-8');
  } catch (e) {
    const from = state.stack.at(-1);
    throw new Error(
      `failed to read file ${file}${from ? ` (included from ${from})` : ''}\n${e instanceof Error ? e.message : String(e)}`,
      { cause: e },
    );
  }
}

/**
 * The visitor pass only sees the entry document, so includes inside included
 * content must be expanded here: parse the content, then splice each nested
 * include's replacement text over its source span (back to front, so earlier
 * offsets stay valid).
 */
async function expandNestedIncludes(
  text: string,
  file: string,
  state: IncludeState,
): Promise<string> {
  const tree = parseTree(text, path.extname(file));
  const targets: { node: IncludeNode; start: number; end: number }[] = [];
  collectIncludes(tree.children as IncludeNode[], targets);
  if (targets.length === 0) return text;

  let out = text;
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i]!;
    const replacement = await resolveNestedInclude(target.node, file, state);
    if (replacement === undefined) continue;
    out = out.slice(0, target.start) + replacement + out.slice(target.end);
  }
  return out;
}

function collectIncludes(
  nodes: IncludeNode[],
  targets: { node: IncludeNode; start: number; end: number }[],
) {
  for (const node of nodes) {
    if (INCLUDE_TYPES.has(node.type) && node.name === 'include') {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) targets.push({ node, start, end });
      continue;
    }

    if (Array.isArray(node.children)) {
      collectIncludes(node.children as IncludeNode[], targets);
    }
  }
}

async function resolveNestedInclude(
  node: IncludeNode,
  fromFile: string,
  state: IncludeState,
): Promise<string | undefined> {
  const specifier = flattenNode(node as MdastNode).trim();
  if (!specifier) return;

  const attributes = parseElementAttributes(node);
  const { file: relativePath, section } = parseSpecifier(specifier);
  const baseDir = 'cwd' in attributes ? state.cwd : path.dirname(fromFile);
  const targetPath = path.resolve(baseDir, relativePath);

  if (isCodeInclude(targetPath, attributes)) {
    return toCodeFence(await readCodeInclude(targetPath, section, attributes, state));
  }

  return readMarkdownInclude(targetPath, section, state);
}

function toCodeFence(code: Code): string {
  const longestRun = (code.value.match(/`+/g) ?? []).reduce((max, run) => {
    return Math.max(max, run.length);
  }, 2);
  const fence = '`'.repeat(longestRun + 1);
  const info = [code.lang ?? '', code.meta ?? ''].filter(Boolean).join(' ');
  return `${fence}${info}\n${code.value}\n${fence}`;
}

function parseTree(source: string, ext: string) {
  const parse = ext === '.mdx' ? mdxToMdast : markdownToMdast;
  return parse(source, { features: PARSE_FEATURES }) as { children: RootContent[] };
}

function parseElementAttributes(element: IncludeNode): Record<string, string | null | undefined> {
  if (!element.attributes) return {};
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

  return element.attributes as Record<string, string | null | undefined>;
}

function parseSpecifier(specifier: string): { file: string; section?: string } {
  const idx = specifier.lastIndexOf('#');
  if (idx === -1) return { file: specifier };
  return { file: specifier.slice(0, idx), section: specifier.slice(idx + 1) };
}

function sliceByPosition(source: string, start?: number, end?: number) {
  if (start === undefined || end === undefined) return undefined;
  return source.slice(start, end);
}

const customIdRegex = /\s*\[#(?<slug>[^]+?)]\s*$/;

function headingId(node: Heading, slugger: Slugger): string | undefined {
  const dataId = (node.data as { hProperties?: { id?: string } } | undefined)?.hProperties?.id;
  if (dataId) return dataId;

  const text = flattenNode(node);
  const match = customIdRegex.exec(text);
  if (match?.[1]) return match[1];
  return slugger.slug(text);
}

function findSectionElement(nodes: IncludeNode[], section: string): IncludeNode | undefined {
  for (const node of nodes) {
    if (
      (node.type === 'mdxJsxFlowElement' || node.type === 'containerDirective') &&
      node.name === 'section' &&
      parseElementAttributes(node).id === section
    ) {
      return node;
    }

    if (Array.isArray(node.children)) {
      const found = findSectionElement(node.children as IncludeNode[], section);
      if (found) return found;
    }
  }
}

function extractSectionRaw(
  children: RootContent[],
  section: string,
  source: string,
): string | undefined {
  const element = findSectionElement(children as IncludeNode[], section);
  if (element) {
    const kids = (element.children ?? []) as RootContent[];
    if (kids.length === 0) return '';
    return sliceByPosition(
      source,
      kids[0]?.position?.start.offset,
      kids[kids.length - 1]?.position?.end.offset,
    );
  }

  const slugger = new Slugger();
  let capturing = false;
  let start: number | undefined;
  let end: number | undefined;

  for (const node of children) {
    if (node.type === 'heading') {
      if (capturing) break;
      if (headingId(node, slugger) === section) {
        capturing = true;
        start = node.position?.start.offset;
        // a section may consist of the heading alone
        end = node.position?.end.offset;
      }
      continue;
    }

    if (capturing) end = node.position?.end.offset ?? end;
  }

  return sliceByPosition(source, start, end);
}

// VS Code–style region extraction
// Adapted from VitePress:
// https://github.com/vuejs/vitepress/blob/main/src/node/markdown/plugins/snippet.ts
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
    return match ? Math.min(min, match[1]!.length) : min;
  }, Infinity);

  return minIndent === Infinity
    ? lines.join('\n')
    : lines.map((l) => l.slice(minIndent)).join('\n');
}

function extractCodeRegion(content: string, regionName: string, file: string): string {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const re of REGION_MARKERS) {
      let match = re.start.exec(lines[i]!);
      if (match?.[1] !== regionName) continue;

      let depth = 1;
      const extractedLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        match = re.start.exec(lines[j]!);
        if (match) {
          depth++;
          continue;
        }

        match = re.end.exec(lines[j]!);
        if (match) {
          if (match[1] === regionName) depth = 0;
          else if (match[1] === '') depth--;
          else continue;

          if (depth > 0) continue;
          return dedent(extractedLines);
        }

        extractedLines.push(lines[j]!);
      }
    }
  }

  throw new Error(`Region "${regionName}" not found in ${file}`);
}
