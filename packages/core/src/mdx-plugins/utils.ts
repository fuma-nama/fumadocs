import type { Nodes, Root, RootContent } from 'mdast';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { Expression, Program } from 'estree-jsx';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import type Hast from 'hast';
import type { VFile } from 'vfile';
import { createStringifier } from './stringifier';
import {
  createCodeOutput as createSharedCodeOutput,
  moduleScope,
  type CodeOutputOptions,
} from '../../../shared/code-output';

export function isJsxElement(node: Nodes): node is MdxJsxFlowElement | MdxJsxTextElement {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

/**
 * Visit a tree in document order, returning `skip` skips the children of a node. Unlike `unist-util-visit`, it doesn't
 * look up the index of each node in its parent, which is quadratic on wide trees.
 */
export function walk<N extends { type: string; children?: N[] }>(
  node: N,
  visitor: (
    node: N,
    index: number | undefined,
    parent: { children: N[] } | undefined,
  ) => 'skip' | void,
  index?: number,
  parent?: { children: N[] },
): void {
  if (visitor(node, index, parent) === 'skip' || !node.children) return;
  for (let i = 0; i < node.children.length; i++)
    walk(node.children[i], visitor, i, node as { children: N[] });
}

export function flattenNode(node: RootContent): string {
  if ('children' in node) return node.children.map(flattenNode).join('');

  if ('value' in node && typeof node.value === 'string') return node.value;

  return '';
}
export function flattenNodeHast(node: Hast.RootContent): string {
  if ('children' in node) {
    return node.children.map(flattenNodeHast).join('');
  }

  return 'value' in node && typeof node.value === 'string' ? node.value : '';
}

export function toMdxExport(name: string, value: unknown): MdxjsEsm {
  return toEsm(`export let ${name} = _fumadocs0;`, [valueToEstree(value)]);
}

export function handleTag(value: string, tag: string): string | false {
  const idx = value.indexOf(tag);
  if (idx !== -1) {
    return value.slice(0, idx).trimEnd() + value.slice(idx + tag.length);
  }

  return false;
}

const parser = Parser.extend(acornJsx());
const placeholderRegex = /^_fumadocs(\d+)$/;

/** the code of an ESM block, the identifiers `_fumadocs<index>` are the expressions */
export function toEsm(code: string, expressions: Expression[] = []): MdxjsEsm {
  const program = parser.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  if (expressions.length > 0) fill(program, expressions);
  return { type: 'mdxjsEsm', value: '', data: { estree: program as unknown as Program } };
}

function fill(node: object, expressions: Expression[]) {
  const record = node as Record<string, { type?: string; name?: string } | null>;
  for (const key in record) {
    const value = record[key];
    if (typeof value !== 'object' || value === null) continue;
    const match = value.type === 'Identifier' && placeholderRegex.exec(value.name!);
    if (match) record[key] = expressions[Number(match[1])];
    else fill(value, expressions);
  }
}

/** the value of a JSX attribute from code */
export function toAttributeValue(code: string) {
  const estree = parser.parse(code, { ecmaVersion: 'latest', sourceType: 'module' }) as Program;
  return { type: 'mdxJsxAttributeValueExpression' as const, value: code, data: { estree } };
}

/** the shared code output, on the stringifier of mdast: estree expressions of replacements go in by placeholders */
export function createCodeOutput(
  file: VFile,
  options: Pick<CodeOutputOptions<Nodes>, 'target' | 'isStatic' | 'keep'>,
) {
  const expressions: Expression[] = [];
  const out = createSharedCodeOutput<Nodes>({
    ...options,
    stringifier: (expression) =>
      createStringifier(file, options.target, (value, fallback) =>
        expression(`_fumadocs${expressions.push(value) - 1}`, fallback),
      ),
    parse: (code) => parser.parse(code, { ecmaVersion: 'latest', sourceType: 'module' }),
    // strings skip the parser
    literal: (value) => `_fumadocs${expressions.push({ type: 'Literal', value }) - 1}`,
  });
  return Object.assign(out, { esm: (code: string) => toEsm(code, expressions) });
}

/** read the names declared by the ESM of a document, wherever its nodes are (like in the content of includes) */
export function esmScope(tree: Root): () => Set<string> {
  return () => {
    const scope = new Set<string>();
    walk<Nodes>(tree, (node) => {
      if (node.type === 'mdxjsEsm' && node.data?.estree) moduleScope(node.data.estree.body, scope);
    });
    return scope;
  };
}
