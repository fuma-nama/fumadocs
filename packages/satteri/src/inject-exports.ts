import type { Element, RootContent } from 'hast';
import type { Data } from 'satteri';

export interface TocJsxExportItem {
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

function flattenHast(node: RootContent): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map(flattenHast).join('');
  return '';
}

export function serializeValueExport(name: string, value: unknown): string {
  return `export const ${name} = ${JSON.stringify(value)};`;
}

export function serializeTocJsxExport(name: string, items: TocJsxExportItem[]): string {
  return serializeValueExport(
    name,
    items.map((item) => ({
      depth: item.depth,
      url: item.url,
      title: flattenHast(item.title),
      ...(typeof item._step === 'number' ? { _step: item._step } : {}),
    })),
  );
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
  const line = serializeValueExport(name, value);
  const idx = data._exports.findIndex((entry) => entry.startsWith(`export const ${name} =`));
  if (idx === -1) data._exports.push(line);
  else data._exports[idx] = line;
}

export function queueTocJsxExport(
  data: Data & { _exports?: string[] },
  name: string,
  items: TocJsxExportItem[],
): void {
  data._exports ??= [];
  const line = serializeTocJsxExport(name, items);
  const idx = data._exports.findIndex((entry) => entry.startsWith(`export const ${name} =`));
  if (idx === -1) data._exports.push(line);
  else data._exports[idx] = line;
}
