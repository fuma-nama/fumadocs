import { getPathnameFromInput } from '@/utils/get-pathname-from-input';

export const supportedMediaTypes = [
  'multipart/form-data',
  'application/json',
  'application/xml',
  'application/x-www-form-urlencoded',
] as const;

export interface RequestData {
  method: string;

  path: Record<string, string>;
  query: Record<string, string>;
  header: Record<string, string>;
  cookie: Record<string, string>;
  body?: unknown;

  bodyMediaType?: (typeof supportedMediaTypes)[number];
}

export const MediaTypeFormatMap = {
  'application/json': 'json',
  'application/xml': 'xml',
  'application/x-www-form-urlencoded': 'url',
} as const;

export function getUrl(url: string, data: RequestData): string {
  return getPathnameFromInput(url, data.path, data.query);
}

export function ident(code: string, tab: number = 1) {
  return code
    .split('\n')
    .map((v) => '  '.repeat(tab) + v)
    .join('\n');
}
