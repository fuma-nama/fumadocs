import { getPathnameFromInput } from '@/utils/get-pathname-from-input';
import type { MediaAdapter } from '@/media/adapter';

export type SampleGenerator = (
  url: string,
  data: RequestData,
  context: {
    mediaAdapters: Record<string, MediaAdapter>;
  },
) => string;

export interface RequestData {
  method: string;

  path: Record<string, string>;
  query: Record<string, string>;
  header: Record<string, string>;
  cookie: Record<string, string>;
  body?: unknown;

  bodyMediaType?: string;
}

export function getUrl(url: string, data: RequestData): string {
  return getPathnameFromInput(url, data.path, data.query);
}

export function ident(code: string, tab: number = 1) {
  return code
    .split('\n')
    .map((v) => '  '.repeat(tab) + v)
    .join('\n');
}
