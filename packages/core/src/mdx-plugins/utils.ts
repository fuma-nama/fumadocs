import type { RootContent } from 'mdast';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { Expression } from 'estree-jsx';
import type { MdxjsEsm } from 'mdast-util-mdx';

export function flattenNode(node: RootContent): string {
  if ('children' in node) return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node && typeof node.value === 'string') return node.value;

  return '';
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
