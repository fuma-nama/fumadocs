import type { MediaAdapter } from '../media/adapter';
import type { RequestData } from '../types';
import * as Shared from '@fumadocs/api-docs/codegen';

export function pathnameFromRequest(pathname: string, { path, query }: RequestData): string {
  // First, resolve path parameters in the pathname
  for (const key in path) {
    const param = path[key];

    pathname = pathname.replace(`{${key}}`, param.value);
  }

  // Check if pathname already contains query parameters (legacy API support)
  const [pathPart, existingQueryString] = pathname.split('?', 2);

  // Parse existing query parameters from the pathname if they exist
  const searchParams = new URLSearchParams(existingQueryString || '');

  // Add new query parameters from the RequestData
  for (const key in query) {
    const param = query[key];
    if (!param || param.values.length === 0) continue;

    // Remove existing parameter first to avoid duplicates
    searchParams.delete(key);
    for (const item of param.values) {
      searchParams.append(key, item);
    }
  }

  // Return the reconstructed URL
  return searchParams.size > 0 ? `${pathPart}?${searchParams}` : pathPart;
}

export type CodeUsageGeneratorRegistry = Shared.CodeUsageGeneratorRegistry<
  RequestData & { url: string },
  { mediaAdapters: Record<string, MediaAdapter>; custom: unknown }
>;

/**
 * Generate code example for given programming language
 */
export type CodeUsageGenerator = Shared.CodeUsageGenerator<
  RequestData & { url: string },
  { mediaAdapters: Record<string, MediaAdapter>; custom: unknown }
>;

/**
 * Generate code example for given programming language
 */
export type InlineCodeUsageGenerator<T = unknown> = Shared.InlineCodeUsageGenerator<
  RequestData & { url: string },
  { mediaAdapters: Record<string, MediaAdapter>; custom: T }
>;

export function createCodeUsageGeneratorRegistry(
  inherit?: CodeUsageGeneratorRegistry,
): CodeUsageGeneratorRegistry {
  return Shared.createCodeUsageGeneratorRegistry(inherit);
}

export type CodeUsageGeneratorFn<T = unknown> = (
  data: RequestData & { url: string },
  context: { mediaAdapters: Record<string, MediaAdapter>; custom: T },
) => string;
