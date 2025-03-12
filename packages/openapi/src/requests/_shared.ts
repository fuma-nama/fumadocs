import { getPathnameFromInput } from '@/utils/get-pathname-from-input';

export interface RequestData {
  method: string;

  path: Record<string, string>;
  query: Record<string, string>;
  header: Record<string, string>;
  cookie: Record<string, string>;
  body?: unknown;

  bodyMediaType?:
    | 'multipart/form-data'
    | 'application/json'
    | 'application/xml';
}

export function getUrl(url: string, data: RequestData): string {
  return getPathnameFromInput(url, data.path, data.query);
}
