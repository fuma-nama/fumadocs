'use client';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { MediaAdapter } from '@/requests/media/adapter';
import type { FC } from 'react';
import type { ExampleRequestItem } from '../operation/request-tabs';

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

export interface OperationClientOptions {
  APIExampleSelector?: FC<{
    items: ExampleRequestItem[];

    value: string | undefined;
    onValueChange: (id: string) => void;
  }>;
}

export function defineClientConfig(options: APIPageClientOptions = {}): APIPageClientOptions {
  return options;
}
