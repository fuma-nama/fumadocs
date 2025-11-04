'use client';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { OperationClientOptions } from '../operation/client';

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
}

export function defineClientConfig(
  options: APIPageClientOptions,
): APIPageClientOptions {
  return options;
}
