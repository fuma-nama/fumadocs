import { useOpenAPI } from '@/headless/runtime';
import { useCallback } from 'react';

/**
 * Get the `localStorage` key of `name`, with the prefix of the page.
 */
export function useStorageKey(): (name: string) => string {
  const { storageKeyPrefix = 'fumadocs-openapi-' } = useOpenAPI();

  return useCallback((name) => storageKeyPrefix + name, [storageKeyPrefix]);
}
