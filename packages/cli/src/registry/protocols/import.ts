import type { ComponentFile } from '@/build';
import type { CompiledFile } from '../schema';

export type ImportInfo =
  | {
      raw: string;
    }
  | {
      target: string;
    }
  | {
      route: string;
    };

export function encodeImport(file: ComponentFile | CompiledFile): string {
  if (file.type === 'route-handler') return `route-handler:${file.route}`;
  return `:${file.target ?? file.path}`;
}

export function decodeImport(s: string): ImportInfo {
  if (s.startsWith(':'))
    return {
      target: s.slice(1),
    };

  if (s.startsWith('route-handler:'))
    return {
      route: s.slice('route-handler:'.length),
    };

  return { raw: s };
}
