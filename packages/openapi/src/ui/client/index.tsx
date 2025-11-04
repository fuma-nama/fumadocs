'use client';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { OperationClientOptions } from '../operation/client';
import type { MediaAdapter } from '@/requests/media/adapter';

export interface APIPageClientOptions {
  playground?: PlaygroundClientOptions;
  operation?: OperationClientOptions;

  /**
   * Set a prefix for `localStorage` keys.
   *
   * Useful when using multiple OpenAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-openapi-`
   */
  storageKeyPrefix?: string;

  /**
   * Support other media types (for client-side serialization)
   */
  mediaAdapters?: Record<string, MediaAdapter>;
}

export function defineClientConfig(
  options: APIPageClientOptions = {},
): APIPageClientOptions {
  return options;
}
