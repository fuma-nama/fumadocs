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

export function getUrl(url: string, data: RequestData): string {
  return getPathnameFromInput(url, data.path, data.query);
}
