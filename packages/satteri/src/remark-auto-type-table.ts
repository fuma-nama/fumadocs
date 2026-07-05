import { defineMdastPlugin, markdownToHast } from 'satteri';
import type { ElementContent, Nodes } from 'hast';
import type { Expression, ExpressionStatement, ObjectExpression } from 'estree';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toEstree } from 'hast-util-to-estree';
import { toJs, jsx } from 'estree-util-to-js';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxFlowElement } from 'mdast-util-mdx';
import { highlightHast, type HighlightHastOptions } from 'fumadocs-core/highlight';
import {
  createGenerator,
  type DocEntry,
  type RawTag,
  type RemarkAutoTypeTableOptions,
  type TypeTableProps,
} from 'fumadocs-typescript';

export type { RemarkAutoTypeTableOptions } from 'fumadocs-typescript';

type RenderHast = (value: string) => Nodes | Promise<Nodes>;

// Satteri parses the `value` source of an `mdxJsxAttributeValueExpression` and
// ignores any pre-built `data.estree` (unlike the classic MDX pipeline). So we
// serialize the JSX-bearing estree back to source ourselves; satteri then
// re-parses and compiles the embedded JSX. `estree-util-to-js`'s `jsx` handlers
// keep the JSX element nodes intact.
// TODO: find a better way to avoid round-trip
function serializeExpression(expression: Expression): string {
  const source = toJs(
    {
      type: 'Program',
      sourceType: 'module',
      body: [{ type: 'ExpressionStatement', expression }],
    },
    { handlers: jsx },
  ).value.trim();
  return source.endsWith(';') ? source.slice(0, -1) : source;
}

function sanitizeHast(node: Nodes): Nodes {
  if (node.type === 'raw') return { type: 'text', value: node.value };
  if ('children' in node && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => sanitizeHast(child as Nodes)),
    } as Nodes;
  }
  return node;
}

function objectBuilder() {
  const out: ObjectExpression = {
    type: 'ObjectExpression',
    properties: [],
  };

  return {
    addExpressionNode(key: string, expression: Expression) {
      out.properties.push({
        type: 'Property',
        method: false,
        shorthand: false,
        computed: false,
        key: { type: 'Literal', value: key },
        kind: 'init',
        value: expression,
      });
    },
    addJsxProperty(key: string, hast: Nodes) {
      const estree = toEstree(hast, {
        elementAttributeNameCase: 'react',
      }).body[0] as ExpressionStatement;
      this.addExpressionNode(key, estree.expression);
    },
    build() {
      return out;
    },
  };
}

function parseTags(tags: RawTag[]) {
  const typed: {
    default?: string;
    params?: { name: string; description?: string }[];
    returns?: string;
  } = {};

  for (const { name: key, text } of tags) {
    if (key === 'default' || key === 'defaultValue') {
      typed.default = text;
      continue;
    }

    if (key === 'param') {
      const sepIdx = text.indexOf('-');
      typed.params ??= [];
      typed.params.push({
        name: sepIdx === -1 ? text.trim() : text.slice(0, sepIdx).trim(),
        description: sepIdx === -1 ? '' : text.slice(sepIdx + 1).trim(),
      });
      continue;
    }

    if (key === 'returns') typed.returns = text;
  }

  return typed;
}

async function buildTypeProp(
  entries: DocEntry[],
  renderType: RenderHast,
  renderMarkdown: RenderHast,
): Promise<ObjectExpression> {
  async function onParam(param: { name: string; description?: string }) {
    const node = objectBuilder();
    node.addExpressionNode('name', valueToEstree(param.name));
    if (param.description) {
      node.addJsxProperty('description', await renderMarkdown(param.description));
    }
    return node.build();
  }

  async function onItem(entry: DocEntry) {
    const node = objectBuilder();
    const tags = parseTags(entry.tags);
    node.addJsxProperty('type', await renderType(entry.simplifiedType));
    node.addJsxProperty('typeDescription', await renderType(entry.type));
    node.addExpressionNode('required', valueToEstree(entry.required));

    if (entry.typeHref) {
      node.addExpressionNode('typeDescriptionLink', valueToEstree(entry.typeHref));
    }
    if (tags.default) node.addJsxProperty('default', await renderType(tags.default));
    if (tags.returns) node.addJsxProperty('returns', await renderMarkdown(tags.returns));
    if (tags.params) {
      node.addExpressionNode('parameters', {
        type: 'ArrayExpression',
        elements: await Promise.all(tags.params.map(onParam)),
      });
    }
    if (entry.description) {
      node.addJsxProperty('description', await renderMarkdown(entry.description));
    }
    if (entry.deprecated) {
      node.addExpressionNode('deprecated', valueToEstree(true));
    }

    return node.build();
  }

  const prop = objectBuilder();
  for (const entry of entries) {
    prop.addExpressionNode(entry.name, await onItem(entry));
  }
  return prop.build();
}

export function remarkAutoTypeTable(config: RemarkAutoTypeTableOptions = {}) {
  const {
    name = 'auto-type-table',
    outputName = 'TypeTable',
    options: generateOptions = {},
    generator = createGenerator(),
    renderMarkdown: renderMarkdownOption,
    renderType: renderTypeOption,
    shiki,
  } = config;

  const renderType: RenderHast =
    renderTypeOption ??
    (async (type) => {
      const nodes = await highlightHast(type, {
        lang: 'ts',
        structure: 'inline',
        defaultColor: false,
        ...(shiki as HighlightHastOptions | undefined),
      });
      return {
        type: 'element',
        tagName: 'span',
        properties: { class: 'shiki' },
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: nodes.children as ElementContent[],
          },
        ],
      };
    });

  const renderMarkdown: RenderHast =
    renderMarkdownOption ??
    ((md) => {
      md = md.replace(/{@link (?<link>[^}]*)}/g, '$1');
      return sanitizeHast(markdownToHast(md, { features: { gfm: true } }));
    });

  return defineMdastPlugin({
    name: 'remark-auto-type-table',
    async mdxJsxFlowElement(node, ctx) {
      if (node.name !== name) return;

      const props: TypeTableProps = {};
      const attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[] = [];
      for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute') {
          attributes.push(attr);
          continue;
        }
        switch (attr.name) {
          case 'cwd':
            props.cwd = true;
            break;
          case 'path':
          case 'name':
          case 'type':
            if (typeof attr.value === 'string') props[attr.name] = attr.value;
            break;
          default:
            attributes.push(attr);
        }
      }

      const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : undefined;
      let basePath = props.cwd ? ctx.data._cwd : generateOptions.basePath;
      if (filePath) basePath ??= path.dirname(filePath);

      const output = await generator.generateTypeTable(props, {
        ...generateOptions,
        basePath,
      });

      const children: MdxJsxFlowElement[] = [];
      for (const doc of output) {
        children.push({
          type: 'mdxJsxFlowElement',
          name: outputName,
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'id',
              value: `type-table-${doc.id}`,
            },
            {
              type: 'mdxJsxAttribute',
              name: 'type',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: serializeExpression(
                  await buildTypeProp(doc.entries, renderType, renderMarkdown),
                ),
              },
            },
            ...attributes,
          ],
          children: [],
        });
      }

      const parent = ctx.parent(node);
      const index = ctx.indexOf(node);
      if (!parent || index === undefined) return;

      if (children.length === 0) {
        ctx.removeNode(node);
      } else if (children.length === 1) {
        ctx.replaceNode(node, children[0]!);
      } else {
        ctx.replaceNode(node, children[0]!);
        ctx.insertChildAt(parent, index + 1, children.slice(1));
      }
    },
  });
}
