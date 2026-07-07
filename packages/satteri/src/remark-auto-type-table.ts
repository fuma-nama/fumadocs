import { defineMdastPlugin, markdownToHast } from 'satteri';
import type { ElementContent, Nodes } from 'hast';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxFlowElement } from 'mdast-util-mdx';
import { highlightHast, type HighlightHastOptions } from 'fumadocs-core/highlight';
import {
  createGenerator,
  type DocEntry,
  type RawTag,
  type RemarkAutoTypeTableOptions,
  type TypeTableProps,
} from 'fumadocs-typescript';
import { jsxToSource } from './utils';

export type { RemarkAutoTypeTableOptions } from 'fumadocs-typescript';

type RenderHast = (value: string) => Nodes | Promise<Nodes>;

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
): Promise<string> {
  async function onItem(entry: DocEntry) {
    let node = '{';
    const tags = parseTags(entry.tags);
    node += `type: ${jsxToSource(await renderType(entry.simplifiedType))},`;
    node += `typeDescription: ${jsxToSource(await renderType(entry.type))},`;
    node += `required: ${JSON.stringify(entry.required)},`;

    if (entry.typeHref) {
      node += `typeDescriptionLink: ${JSON.stringify(entry.typeHref)},`;
    }
    if (tags.default) node += `default: ${jsxToSource(await renderType(tags.default))},`;
    if (tags.returns) node += `returns: ${jsxToSource(await renderMarkdown(tags.returns))},`;
    if (tags.params) {
      const params = await Promise.all(
        tags.params.map(async ({ name, description }) => {
          let param = '{';
          param += `name: ${JSON.stringify(name)},`;
          if (description) {
            param += `description: ${jsxToSource(await renderMarkdown(description))},`;
          }
          param += '}';
          return param;
        }),
      );
      node += `parameters: [${params.join(', ')}],`;
    }
    if (entry.description)
      node += `description: ${jsxToSource(await renderMarkdown(entry.description))},`;
    if (entry.deprecated) node += `deprecated: true,`;

    node += '}';
    return node;
  }

  let prop = '{';
  for (const entry of entries) {
    prop += `${JSON.stringify(entry.name)}: ${await onItem(entry)},`;
  }
  prop += '}';
  return prop;
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
                value: await buildTypeProp(doc.entries, renderType, renderMarkdown),
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
