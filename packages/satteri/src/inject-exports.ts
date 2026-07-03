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
  const lines = dedupeNamedExports(data._exports ?? []);
  if (lines.length === 0) return code;

  return `${code.trimEnd()}\n${lines.join('\n')}\n`;
}

function dedupeNamedExports(lines: string[]): string[] {
  const out: string[] = [];
  const indexes = new Map<string, number>();

  for (const line of lines) {
    const name = /^export const ([A-Za-z_$][\w$]*) =/.exec(line)?.[1];
    if (!name) {
      out.push(line);
      continue;
    }

    const index = indexes.get(name);
    if (index === undefined) {
      indexes.set(name, out.length);
      out.push(line);
    } else {
      out[index] = line;
    }
  }

  return out;
}

function queueExport(
  data: Data & { _exports?: string[]; _exportIndexes?: Map<string, number> },
  name: string,
  line: string,
): void {
  data._exports ??= [];
  data._exportIndexes ??= new Map();

  const index = data._exportIndexes.get(name);
  if (index !== undefined) {
    data._exports[index] = line;
    return;
  }

  data._exportIndexes.set(name, data._exports.length);
  data._exports.push(line);
}

export function queueDataExport(
  data: Data & { _exports?: string[]; _exportIndexes?: Map<string, number> },
  name: string,
  value: unknown,
): void {
  queueExport(data, name, serializeValueExport(name, value));
}

export function queueTocJsxExport(
  data: Data & { _exports?: string[]; _exportIndexes?: Map<string, number> },
  name: string,
  items: TocJsxExportItem[],
): void {
  queueExport(data, name, serializeTocJsxExport(name, items));
}
