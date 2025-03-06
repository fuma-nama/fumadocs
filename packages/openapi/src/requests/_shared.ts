import type { RequestData } from '@/ui/contexts/code-example';
import { getPathnameFromInput } from '@/utils/get-pathname-from-input';

export function getUrl(url: string, data: RequestData): string {
  return getPathnameFromInput(url, data.path, data.query);
}
