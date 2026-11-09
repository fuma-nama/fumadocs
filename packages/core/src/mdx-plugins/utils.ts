import type { Nodes, RootContent } from 'mdast';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { Expression, Program } from 'estree-jsx';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import type Hast from 'hast';
import type { VFile } from 'vfile';
import { createStringifier, type Stringifier } from './stringifier';
import {
  createCodeOutput as createSharedCodeOutput,
  readsProps,
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

/** the text of a node, authored expressions are code and render from it */
export function flattenNode(node: RootContent): string {
  if ('children' in node) return node.children.map(flattenNode).join('');
  if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') return '';

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
  return toMdxExportRaw(name, valueToEstree(value));
}

export function toMdxExportRaw(name: string, expression: Expression): MdxjsEsm {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExportNamedDeclaration',
            attributes: [],
            specifiers: [],
            declaration: {
              type: 'VariableDeclaration',
              kind: 'let',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name,
                  },
                  init: expression,
                },
              ],
            },
          },
        ],
      },
    },
  };
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
  for (const [key, value] of Object.entries(node)) {
    if (typeof value !== 'object' || value === null) continue;
    const match = value.type === 'Identifier' && placeholderRegex.exec(value.name);
    if (match) (node as Record<string, unknown>)[key] = expressions[Number(match[1])];
    else fill(value, expressions);
  }
}

/** the shared code output, on the stringifier of mdast: estree expressions of replacements go in by placeholders */
export function createCodeOutput(file: VFile, namespace?: string) {
  const expressions: Expression[] = [];
  let stringifier: Stringifier;
  const out = createSharedCodeOutput<Nodes, Stringifier>(
    (expression) =>
      (stringifier = createStringifier(file, namespace, (value, fallback) =>
        expression(`_fumadocs${expressions.push(value) - 1}`, fallback, readsProps(value)),
      )),
    {
      program: (node) => (node.data && 'estree' in node.data ? node.data.estree : undefined),
      range: (node) => stringifier.range(node),
    },
  );
  return Object.assign(out, { esm: (code: string) => toEsm(code, expressions) });
}
