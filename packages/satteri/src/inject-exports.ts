import { toEstree } from 'hast-util-to-estree';
import type { Element } from 'hast';
import type { JSXElement } from 'estree-jsx';
import type { Data } from 'satteri';

export interface TocJsxExportItem {
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

export function serializeValueExport(name: string, value: unknown): string {
  return `export const ${name} = ${JSON.stringify(value)};`;
}

export function serializeTocJsxExport(name: string, items: TocJsxExportItem[]): string {
  const esmItems: {
    title: JSXElement;
    url: string;
    depth: number;
    _step?: number;
  }[] = [];

  for (const item of items) {
    const root = toEstree(item.title, {
      elementAttributeNameCase: 'react',
      stylePropertyNameCase: 'dom',
    }).body[0];

    if (root.type === 'ExpressionStatement' && root.expression.type === 'JSXElement') {
      esmItems.push({ ...item, title: root.expression });
    }
  }

  return `export const ${name} = ${JSON.stringify(esmItems, null, 0)};`;
}

export function appendExports(
  code: string,
  data: Data & {
    _exports?: string[];
  },
): string {
  const lines = data._exports ?? [];
  if (lines.length === 0) return code;

  return `${code.trimEnd()}\n${lines.join('\n')}\n`;
}

export function queueDataExport(
  data: Data & { _exports?: string[] },
  name: string,
  value: unknown,
): void {
  data._exports ??= [];
  data._exports.push(serializeValueExport(name, value));
}

export function queueTocJsxExport(
  data: Data & { _exports?: string[] },
  name: string,
  items: TocJsxExportItem[],
): void {
  data._exports ??= [];
  data._exports.push(serializeTocJsxExport(name, items));
}
