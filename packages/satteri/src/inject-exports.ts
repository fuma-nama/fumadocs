import '@/data-map';
import type { Data } from 'satteri';
import type { TocJsxExportItem } from '@/data-map';

export type { TocJsxExportItem } from '@/data-map';

export function serializeValueExport(name: string, value: unknown): string {
  return `export const ${name} = ${JSON.stringify(value)};`;
}

export function serializeTocJsxExport(name: string, items: TocJsxExportItem[]): string {
  return serializeValueExport(name, items);
}

export function appendExports(code: string, data: Data): string {
  const lines = data._exports ?? [];
  if (lines.length === 0) return code;

  return `${code.trimEnd()}\n${lines.join('\n')}\n`;
}

export function queueDataExport(data: Data, name: string, value: unknown): void {
  data._exports ??= [];
  const line = serializeValueExport(name, value);
  const idx = data._exports.findIndex((entry) => entry.startsWith(`export const ${name} =`));
  if (idx === -1) data._exports.push(line);
  else data._exports[idx] = line;
}

export function queueTocJsxExport(data: Data, name: string, items: TocJsxExportItem[]): void {
  data._exports ??= [];
  const line = serializeTocJsxExport(name, items);
  const idx = data._exports.findIndex((entry) => entry.startsWith(`export const ${name} =`));
  if (idx === -1) data._exports.push(line);
  else data._exports[idx] = line;
}
